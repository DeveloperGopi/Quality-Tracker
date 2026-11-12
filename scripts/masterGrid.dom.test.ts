/**
 * MASTER TABLE — DOM alignment contract (header vs body vs group band).
 *
 * Renders the REAL components (MasterGridHead / MasterGridRow /
 * GroupedMasterTable — no copies) in happy-dom and pins the fix for the
 * "header and body are in different columns" bug:
 *
 *   • band, header row and every body row carry the IDENTICAL
 *     grid-template-columns string and the identical cell order — with a CSS
 *     grid, same template + same order ⇒ same x/width for a column,
 *   • every column has EXACTLY one header cell and one body cell per row,
 *     with the same alignment and the same sticky `left`,
 *   • every row has the SAME fixed height per density (36 / 48px), including
 *     rows with blank values, a very long Remarks and Tamil text,
 *   • the group band spans exactly the visible columns of its group and
 *     disappears when the group is hidden,
 *   • reorder + resize rebuild the ONE template that every row adopts,
 *   • 157 rows are virtualized against the same fixed row height,
 *   • horizontal scrolling, a hidden group and a root font-size / zoom change
 *     never break header ↔ body equality.
 *
 * happy-dom has no layout engine, so geometric equality is asserted
 * structurally: the same inline template + the same cell order + the same
 * per-cell `left`/alignment is exactly what makes getBoundingClientRect()
 * equal in a real browser, and the contract is verified on the real markup.
 *
 * Run: bun test ./scripts
 */
import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

/* --------------------------------------------------------------------------- */
/* 1 — DOM globals: installed at module scope. react/react-dom and the table    */
/*     components are imported DYNAMICALLY inside the tests, i.e. after this.   */
/* --------------------------------------------------------------------------- */

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

/** The bits of happy-dom's Window this file pokes at, typed. */
type MediaQueryListLike = {
  matches: boolean;
  media: string;
  addEventListener?: (type: string, cb: () => void) => void;
  removeEventListener?: (type: string, cb: () => void) => void;
  addListener?: (cb: () => void) => void;
  removeListener?: (cb: () => void) => void;
};
type WinExtras = {
  CustomEvent: typeof CustomEvent;
  MouseEvent: typeof MouseEvent;
  KeyboardEvent: typeof KeyboardEvent;
  Event: typeof Event;
  getComputedStyle?: (elt: Element) => CSSStyleDeclaration;
  requestAnimationFrame?: (cb: FrameRequestCallback) => number;
  cancelAnimationFrame?: (id: number) => void;
  ResizeObserver?: typeof ResizeObserver;
  matchMedia?: (query: string) => MediaQueryListLike;
};
const extras = win as unknown as WinExtras;

defineGlobal("window", win);
defineGlobal("document", win.document);
defineGlobal("HTMLElement", win.HTMLElement);
defineGlobal("Element", win.Element);
defineGlobal("Node", win.Node);
defineGlobal("Event", win.Event);
defineGlobal("CustomEvent", extras.CustomEvent);
defineGlobal("MouseEvent", extras.MouseEvent);
defineGlobal("KeyboardEvent", extras.KeyboardEvent);
defineGlobal("getComputedStyle", extras.getComputedStyle?.bind(win));
const raf = extras.requestAnimationFrame?.bind(win);
const caf = extras.cancelAnimationFrame?.bind(win);
defineGlobal(
  "requestAnimationFrame",
  raf ??
    ((cb: FrameRequestCallback) =>
      setTimeout(() => cb(Date.now()), 0) as unknown as number),
);
defineGlobal("cancelAnimationFrame", caf ?? ((id: number) => clearTimeout(id)));
defineGlobal(
  "ResizeObserver",
  typeof extras.ResizeObserver === "function"
    ? extras.ResizeObserver
    : ResizeObserverStub,
);

// happy-dom has no layout engine (every rect is 0×0), while TanStack Virtual
// refuses to build a range for a 0-tall scroll viewport — so give elements a
// deterministic viewport-sized rect: the emulated browser window.
const VIEWPORT = { width: 1200, height: 600 };
// TanStack Virtual measures the scroll viewport with offsetWidth/offsetHeight.
for (const prop of ["offsetWidth", "offsetHeight"] as const) {
  Object.defineProperty(win.HTMLElement.prototype, prop, {
    configurable: true,
    get() {
      return prop === "offsetWidth" ? VIEWPORT.width : VIEWPORT.height;
    },
  });
}
(win.Element.prototype as unknown as Record<string, unknown>).getBoundingClientRect =
  function () {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: VIEWPORT.width,
      bottom: VIEWPORT.height,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      toJSON: () => ({}),
    };
  };

if (typeof extras.matchMedia !== "function") {
  extras.matchMedia = (media: string): MediaQueryListLike => ({
    matches: false,
    media,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
}

/* --------------------------------------------------------------------------- */
/* 2 — Fixtures                                                                */
/* --------------------------------------------------------------------------- */

import type { ReactElement } from "react";
import type { SortingState } from "@tanstack/react-table";

import { type MasterRow } from "../src/lib/masterColumns";
import {
  DEFAULT_VIEW,
  ROW_HEIGHT,
  moveColumn,
  orderedVisibleColumns,
  type Density,
  type MasterView,
} from "../src/lib/masterView";
import { ROW_ACTIONS_WIDTH, buildMasterGrid } from "../src/lib/masterGrid";

type RowSpec = {
  id: string;
  name: string;
  block?: string | null;
  phc?: string | null;
  type?: string | null;
  nin?: string | null;
  remarks?: string | null;
  updatedAt?: number | null;
  cycle?: number | null;
};

function makeRow(spec: RowSpec): MasterRow {
  const blank = spec.name === "";
  return {
    facility: {
      _id: spec.id,
      name: blank ? "Unnamed facility" : spec.name,
      block: (spec.block ?? "") as string,
      phc: (spec.phc ?? "") as string,
      facilityType: (spec.type ?? "") as string,
      ninNumber: spec.nin === undefined ? "1201004471" : spec.nin,
      eligibility: blank ? null : "Eligible",
      currentStatus: blank ? null : "SA Not Yet Initiated",
      statusOverride: null,
      remarks: spec.remarks === undefined ? "" : spec.remarks,
      updatedAt: spec.updatedAt ?? null,
      nqasIaQ1: null,
      nqasIaQ2: null,
      kayakalpIaQ1: null,
      kayakalpIaQ2: null,
    },
    cycleNumber: spec.cycle ?? null,
    cycleType: null,
    sa: null,
    nqas: null,
    fund: null,
    noc: null,
    building: null,
    ia: null,
    resultDocumentId: null,
    resultDocumentName: null,
  };
}

const LONG_REMARKS =
  "The block health office reported a sustained shortfall of paramedical staff " +
  "through the last quarter; plumbing work on the labour room is still pending " +
  "and the pending gap-closure procurement has been re-tendered twice so far.";

const TAMIL_REMARKS =
  "அரசு மருத்துவமனையில் சுகாதாரப் பணியாளர்கள் பற்றாக்குறை தொடர்கிறது; " +
  "பிரசவ அறை பழுதுபார்ப்பு பணி இன்னும் முடியவில்லை, மேலும் திட்ட நிதி ஒதுக்கீடு " +
  "கோரிக்கை நிலுவையில் உள்ளது என்று வட்டார சுகாதார அலுவலர் தெரிவித்தார்.";

/** Three sample rows: normal, Tamil + long remarks, and all-blank. */
const sampleRows: MasterRow[] = [
  makeRow({
    id: "a",
    name: "Government PHC Ariyur",
    block: "Ariyur",
    phc: "Ariyur West",
    type: "HWC PHC",
    cycle: 2,
    remarks: LONG_REMARKS,
    updatedAt: Date.UTC(2026, 9, 14, 3, 30),
  }),
  makeRow({
    id: "b",
    name: "அரசு ஆரம்ப சுகாதார நிலையம் கோவிலூரு",
    block: "கோவிலூரு",
    phc: "கோவிலூரு கிழக்கு",
    type: "UAMM",
    nin: null,
    cycle: 1,
    remarks: TAMIL_REMARKS,
  }),
  makeRow({
    id: "c",
    name: "",
    block: "",
    phc: "",
    type: "",
    nin: null,
    remarks: null,
    cycle: null,
  }),
];

/** 157 rows — the virtualization case from the brief. */
const manyRows: MasterRow[] = Array.from({ length: 157 }, (_, i) =>
  makeRow({
    id: `r${i}`,
    name: `Facility ${i}`,
    block: `Block ${i % 7}`,
    phc: `PHC ${i % 5}`,
    type: i % 2 ? "HWC PHC" : "HWC HSC",
    nin: i % 3 === 0 ? null : `12010044${i}`,
    remarks: i % 13 === 0 ? LONG_REMARKS : "",
    cycle: i % 4,
    updatedAt: i % 5 === 0 ? null : Date.UTC(2026, 9, i % 28, 6, 0),
  }),
);

/** The screenshot's columns, plus a couple of neighbours from other groups. */
const VIEW: MasterView = {
  presetId: "custom",
  visibleKeys: [
    "facility",
    "block",
    "phc",
    "nin",
    "type",
    "certCycle",
    "eligibility",
    "pipelineStatus",
    "certStatus",
    "certDate",
    "remarks",
    "lastUpdated",
    "update",
  ],
  order: [],
  density: "comfortable",
};

const SIX = ["facility", "block", "phc", "nin", "type", "certCycle"];
const EMPTY_SORTING: SortingState = [];
const noop = () => {};

/* --------------------------------------------------------------------------- */
/* 3 — Mount helpers                                                            */
/* --------------------------------------------------------------------------- */

async function tick(ms = 10) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type H = typeof import("react").createElement;
type Comps = typeof import("../src/components/master/GroupedMasterTable");
type CreateRoot = typeof import("react-dom/client").createRoot;

let h: H;
let createRoot: CreateRoot;
let comps: Comps;
/** The identity cell is a real <Link> (Ctrl/Cmd+click opens the profile in a
 *  new tab), so the real markup only renders inside a router — exactly as it
 *  does in the app. */
let MemoryRouter: typeof import("react-router").MemoryRouter;

async function deps() {
  if (!h) h = (await import("react")).createElement;
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  if (!comps)
    comps = await import("../src/components/master/GroupedMasterTable");
  if (!MemoryRouter) MemoryRouter = (await import("react-router")).MemoryRouter;
  return { h, createRoot, comps };
}

const mounted: { unmount: () => void; container: HTMLElement }[] = [];

async function mount(element: ReactElement) {
  await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot(container);
  root.render(h(MemoryRouter, null, element));
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

function q(root: ParentNode | null | undefined, selector: string): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll(selector)) as HTMLElement[];
}

function cleanup() {
  while (mounted.length) mounted.pop()?.unmount();
}

/** Band + header row + every body row, composed exactly like the table. */
async function renderGrid(opts: {
  view: MasterView;
  rows?: MasterRow[];
  selection?: boolean;
  widthOverrides?: Record<string, number>;
  scrolledX?: boolean;
  narrow?: boolean;
}) {
  await deps();
  const rows = opts.rows ?? sampleRows;
  const grid = buildMasterGrid(opts.view, {
    widthOverrides: opts.widthOverrides,
    // Part 5 — no checkbox column; the frozen defaults start at left 0.
    pinnedKeys: ["facility", "type"],
  });
  const element = h(
    "div",
    { "data-testid": "table" },
    h(comps.MasterGridHead, {
      grid,
      sorting: EMPTY_SORTING,
      labels: {},
      onSort: noop,
      onResizeStart: () => noop,
      onResizeReset: noop,
      scrolledX: opts.scrolledX ?? false,
    }),
    ...rows.map((row, i) =>
      h(comps.MasterGridRow, {
        key: row.facility._id,
        row,
        index: i,
        cells: grid.cells,
        gridTemplate: grid.template,
        totalWidth: grid.totalWidth,
        top: i * grid.rowHeight,
        rowHeight: grid.rowHeight,
        density: opts.view.density,
        dupes: new Set<string>(),
        zebra: i % 2 === 1,
        scrolledX: opts.scrolledX ?? false,
        onOpen: noop,
      }),
    ),
  );
  const container = await mount(element);
  return { container, grid, rows };
}

/**
 * THE alignment contract: band, header and every body row share one template
 * and one cell order, and each column's header cell and body cells share
 * alignment + sticky offset. With a CSS grid that is exactly what makes
 * `getBoundingClientRect().left/.width` equal in a real browser.
 */
function assertAligned(
  container: HTMLElement,
  grid: ReturnType<typeof buildMasterGrid>,
  rowCount: number,
) {
  const band = q(container, '[data-testid="master-band"]')[0];
  const headerRow = q(container, '[data-testid="master-header-row"]')[0];
  const rowEls = q(container, '[data-testid="master-row"]');
  expect(band).toBeDefined();
  expect(headerRow).toBeDefined();
  expect(rowEls.length).toBe(rowCount);

  // ONE template string, verbatim, on all three row kinds.
  expect(headerRow.style.gridTemplateColumns).toBe(grid.template);
  expect(band.style.gridTemplateColumns).toBe(grid.template);
  for (const row of rowEls)
    expect(row.style.gridTemplateColumns).toBe(grid.template);

  // Same cell order everywhere: header keys === model keys === row keys.
  const headerKeys = q(headerRow, "[data-header]").map((el) =>
    el.getAttribute("data-header"),
  );
  expect(headerKeys).toEqual(grid.cells.map((c) => c.key));
  const modelKeys = grid.cells.map((c) => c.key);
  for (const row of rowEls) {
    const cellKeys = q(row, "[data-cell]").map((el) =>
      el.getAttribute("data-cell"),
    );
    expect(cellKeys).toEqual(modelKeys);
  }

  // Per column: the header cell and EVERY body cell agree on alignment and
  // on the sticky left offset (the two inputs to a cell's x-position).
  for (const key of headerKeys) {
    const head = headerRow.querySelector(
      `[data-header="${key}"]`,
    ) as HTMLElement;
    expect(head).toBeTruthy();
    for (const row of rowEls) {
      const cells = q(row, `[data-cell="${key}"]`);
      expect(cells.length).toBe(1); // exactly ONE value per row per column
      const body = cells[0];
      expect(body.getAttribute("data-align")).toBe(head.getAttribute("data-align"));
      expect(body.style.left).toBe(head.style.left);
    }
  }

  // Header and body text share the same 12px inset (the offset bug).
  expect(headerRow.querySelector("[data-header]")?.className).toContain("px-3");

  // The band spans exactly the model's bands.
  const bandEls = q(container, "[data-band-span]");
  expect(bandEls.length).toBe(grid.bands.length);
  const spanSum = bandEls.reduce(
    (sum, el) => sum + Number(el.getAttribute("data-band-span")),
    0,
  );
  expect(spanSum).toBe(grid.cells.length);
  grid.bands.forEach((b, i) => {
    expect(Number(bandEls[i].getAttribute("data-band-span"))).toBe(b.span);
    expect(bandEls[i].getAttribute("data-band-sticky")).toBe(b.sticky ? "1" : "0");
    /* PART 4: every band starts on the grid line of its FIRST column, so a
       label can never sit above another group's columns. */
    expect((bandEls[i] as HTMLElement).style.gridColumn).toBe(
      `${b.start} / span ${b.span}`,
    );
    expect(Number(bandEls[i].getAttribute("data-band-start"))).toBe(b.start);
  });
  // Part 5 — the first band is the first real group (Identity), starting on
  // grid line 1: there is no checkbox column any more.
  expect(bandEls[0].getAttribute("data-band-group")).toBe("identity");
  expect(Number(bandEls[0].getAttribute("data-band-start"))).toBe(1);

  return { band, headerRow, rowEls };
}

function assertRowHeights(rowEls: HTMLElement[], density: Density) {
  const expected = `${ROW_HEIGHT[density]}px`;
  expect(rowEls.length).toBeGreaterThan(0);
  for (const row of rowEls) expect(row.style.height).toBe(expected);
}

/* --------------------------------------------------------------------------- */
/* 4 — Tests                                                                   */
/* --------------------------------------------------------------------------- */

describe("master table — header and body are in the same columns", () => {
  test("band, header and 3 body rows share ONE template in both densities", async () => {
    for (const density of ["compact", "comfortable"] as const) {
      const view = { ...VIEW, density };
      const { container, grid } = await renderGrid({ view });
      assertAligned(container, grid, sampleRows.length);
      assertRowHeights(
        q(container, '[data-testid="master-row"]'),
        density,
      );

      // The screenshot's six columns: exactly one header, one value per row.
      for (const key of SIX) {
        expect(q(container, `[data-header="${key}"]`).length).toBe(1);
        expect(q(container, `[data-cell="${key}"]`).length).toBe(
          sampleRows.length,
        );
      }
      // Blank / long / Tamil rows render and still occupy one fixed-height row.
      const text = container.textContent ?? "";
      expect(text).toContain("Government PHC Ariyur");
      expect(text).toContain("அரசு ஆரம்ப சுகாதார நிலையம் கோவிலூரு");
      expect(text).toContain(LONG_REMARKS.slice(0, 40));
      cleanup();
    }
  });

  test("every row height is identical per density (no staggering)", async () => {
    for (const density of ["compact", "comfortable"] as const) {
      const { container } = await renderGrid({
        view: { ...VIEW, density },
        rows: manyRows.slice(0, 8),
      });
      const heights = new Set(
        q(container, '[data-testid="master-row"]').map((r) => r.style.height),
      );
      expect(heights.size).toBe(1);
      expect([...heights][0]).toBe(`${ROW_HEIGHT[density]}px`);
      expect(ROW_HEIGHT.compact).toBe(36);
      expect(ROW_HEIGHT.comfortable).toBe(48);
      cleanup();
    }
  });

  test("the group band spans exactly the columns it covers; hiding a group drops it", async () => {
    const withCert = { ...VIEW };
    const first = await renderGrid({ view: withCert });
    const certBands = first.grid.bands.filter((b) => b.id === "certification");
    expect(certBands.length).toBeGreaterThan(0);
    expect(
      certBands.reduce((sum, b) => sum + b.span, 0),
    ).toBe(
      first.grid.cells.filter((c) => c.group === "certification").length,
    );
    cleanup();

    // Hide the whole certification group (what the Column Manager does).
    const withoutCert: MasterView = {
      ...withCert,
      visibleKeys: withCert.visibleKeys.filter(
        (k) => !["certStatus", "certDate"].includes(k),
      ),
    };
    const second = await renderGrid({ view: withoutCert });
    expect(
      second.grid.bands.some((b) => b.id === "certification"),
    ).toBe(false);
    assertAligned(second.container, second.grid, sampleRows.length);
    cleanup();
  });

  test("reordering and resizing rebuild the ONE template every row adopts", async () => {
    const view = { ...VIEW, order: [] as string[] };
    const reordered = moveColumn(view, "certStatus", 0, ["facility", "type"]);
    const { container, grid } = await renderGrid({
      view: reordered,
      widthOverrides: { facility: 300 },
    });
    expect(grid.template).toContain("300px");
    const dataKeys = grid.cells
      .filter((c) => c.kind === "data" && !c.pinRight)
      .map((c) => c.key);
    expect(dataKeys.slice(0, 3)).toEqual([
      "facility",
      "type",
      "certStatus",
    ]);
    expect(
      orderedVisibleColumns(reordered, ["facility", "type"]).map((c) => c.key),
    ).toEqual(dataKeys);
    // The row-actions utility column trails every view, and no data column
    // shifts because of it.
    const actions = grid.cells[grid.cells.length - 1];
    expect(actions.key).toBe("actions");
    expect(actions.pinRight).toBe(true);
    assertAligned(container, grid, sampleRows.length);
    assertRowHeights(q(container, '[data-testid="master-row"]'), "comfortable");
    cleanup();
  });

  test("157 rows virtualized: fixed row height, same template as the header", async () => {
    await deps();
    for (const density of ["compact", "comfortable"] as const) {
      const view = { ...VIEW, density };
      const container = await mount(
        h(comps.GroupedMasterTable, {
          rows: manyRows,
          labels: {},
          view,
          sorting: EMPTY_SORTING,
          onSortingChange: noop,
          onDensityChange: noop,
          onOpenRow: noop,
          onColumnsClick: noop,
          totalRowCount: 157,
          selected: new Set<string>(),
          onToggleRow: noop,
          onToggleAll: noop,
        }),
      );

      // The virtualizer's total height = 157 × the ONE fixed row height.
      const body = q(container, '[data-testid="master-body"]')[0];
      expect(body).toBeDefined();
      expect(body.style.height).toBe(
        `${157 * ROW_HEIGHT[density]}px`,
      );

      const headerRow = q(container, '[data-testid="master-header-row"]')[0];
      const headerKeys = q(headerRow, "[data-header]").map((el) =>
        el.getAttribute("data-header"),
      );
      const rowEls = q(container, '[data-testid="master-row"]');
      // A WINDOW of rows, not all 157 — the list really is virtualized.
      expect(rowEls.length).toBeGreaterThan(0);
      expect(rowEls.length).toBeLessThan(manyRows.length);
      for (const row of rowEls) {
        expect(row.style.height).toBe(`${ROW_HEIGHT[density]}px`);
        expect(row.style.gridTemplateColumns).toBe(
          headerRow.style.gridTemplateColumns,
        );
        expect(
          q(row, "[data-cell]").map((el) => el.getAttribute("data-cell")),
        ).toEqual(headerKeys);
        for (const key of SIX) {
          expect(q(row, `[data-cell="${key}"]`).length).toBe(1);
        }
      }
      // Exactly one header per column, and the band tiles the header.
      for (const key of SIX)
        expect(q(container, `[data-header="${key}"]`).length).toBe(1);
      const spanSum = q(container, "[data-band-span]").reduce(
        (sum, el) => sum + Number(el.getAttribute("data-band-span")),
        0,
      );
      expect(spanSum).toBe(headerKeys.length); // the bands tile the WHOLE row

      // The "Columns" counter counts DATA columns only (no checkbox/action).
      const grid = buildMasterGrid(view, { pinnedKeys: ["facility", "type"] });
      const counter = container.textContent?.match(/Columns\s*(\d+)/);
      expect(grid.dataColumnCount).toBe(
        grid.cells.filter((c) => c.kind === "data" && !c.pinRight).length,
      );
      expect(counter).not.toBeNull();
      expect(Number(counter?.[1])).toBe(grid.dataColumnCount);
      cleanup();
    }
  });

  test("the Master List has NO selection UI (Part 5)", async () => {
    await deps();
    const container = await mount(
      h(comps.GroupedMasterTable, {
        rows: manyRows,
        labels: {},
        view: VIEW,
        sorting: EMPTY_SORTING,
        onSortingChange: noop,
        onOpenRow: noop,
        onColumnsClick: noop,
        totalRowCount: 157,
        pinnedKeys: ["facility", "type"],
      }),
    );
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-header="__select"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-cell="__select"]')).toHaveLength(0);
    // Facility is the first header cell and starts at the scrollport edge.
    const first = container.querySelector('[data-header="facility"]') as HTMLElement;
    expect(first).toBeTruthy();
    expect(first.style.left).toBe("0px");
    cleanup();
  });

  test("horizontal scrolling keeps the contract and shades the last pin", async () => {
    await deps();
    const container = await mount(
      h(comps.GroupedMasterTable, {
        rows: manyRows,
        labels: {},
        view: VIEW,
        sorting: EMPTY_SORTING,
        onSortingChange: noop,
        onDensityChange: noop,
        onOpenRow: noop,
        onColumnsClick: noop,
        totalRowCount: 157,
        pinnedKeys: ["facility", "type"],
      }),
    );
    const scroller = container.querySelector(
      '[data-printable="master-table"]',
    ) as HTMLElement;
    expect(scroller).toBeTruthy();

    const templateBefore = (
      q(container, '[data-testid="master-header-row"]')[0] as HTMLElement
    ).style.gridTemplateColumns;

    // Scroll horizontally — ONE scroll container, no scrollLeft syncing.
    scroller.scrollLeft = 300;
    scroller.dispatchEvent(new extras.Event("scroll", { bubbles: true }));
    await tick();

    const headerRow = q(container, '[data-testid="master-header-row"]')[0];
    expect(headerRow.style.gridTemplateColumns).toBe(templateBefore);
    const headerKeys = q(headerRow, "[data-header]").map((el) =>
      el.getAttribute("data-header"),
    );
    for (const row of q(container, '[data-testid="master-row"]')) {
      expect(row.style.gridTemplateColumns).toBe(templateBefore);
      expect(
        q(row, "[data-cell]").map((el) => el.getAttribute("data-cell")),
      ).toEqual(headerKeys);
      for (const key of headerKeys) {
        const head = headerRow.querySelector(
          `[data-header="${key}"]`,
        ) as HTMLElement;
        const body = q(row, `[data-cell="${key}"]`)[0];
        expect(body.style.left).toBe(head.style.left);
      }
    }
    // The last pinned column carries the soft shadow once scrolled.
    const pinnedKeys = q(headerRow, "[data-header]")
      .filter((el) => el.style.left !== "")
      .map((el) => el.getAttribute("data-header"));
    expect(pinnedKeys.length).toBeGreaterThan(0);
    const lastPinned = headerRow.querySelector(
      `[data-header="${pinnedKeys[pinnedKeys.length - 1]}"]`,
    ) as HTMLElement;
    expect(lastPinned.className).toContain("shadow-");
    cleanup();
  });

  test("zoom / root font-size changes cannot move a column", async () => {
    const first = await renderGrid({ view: VIEW });
    const template = first.grid.template;
    cleanup();

    // 125% zoom scales everything uniformly in a browser; the proof that
    // nothing here can drift is that the layout contract is expressed in
    // fixed px, not in rem/%/content — so it is identical with a different
    // root font size / zoom level applied.
    const rootEl = win.document.documentElement as HTMLElement;
    rootEl.style.fontSize = "20px";
    (rootEl.style as unknown as Record<string, string>).zoom = "1.25";
    const second = await renderGrid({ view: VIEW });
    expect(second.grid.template).toBe(template);
    assertAligned(second.container, second.grid, sampleRows.length);
    rootEl.style.fontSize = "";
    cleanup();
  });

  test("the default view stays readable: slim column set, pinned anchor first", async () => {
    const grid = buildMasterGrid(DEFAULT_VIEW, { pinnedKeys: ["facility"] });
    const dataKeys = grid.cells
      .filter((c) => c.kind === "data" && !c.pinRight)
      .map((c) => c.key);
    // The slim overview starts with the frozen Facility cell; the type, block
    // and PHC labels live inside it and their separate columns stay optional.
    expect(dataKeys.slice(0, 4)).toEqual([
      "facility",
      "certCycle",
      "pipelineStatus",
      "nextAction",
    ]);
    // Slim enough for a 1366px screen (sidebar + padding ≈ 1024px of table).
    // The trailing row-actions utility column is pinned right and sits OUTSIDE
    // that budget: it is always on screen without adding a scroll for it.
    expect(grid.totalWidth - ROW_ACTIONS_WIDTH).toBeLessThanOrEqual(1024);
    expect(grid.actionsCell?.widthPx).toBe(ROW_ACTIONS_WIDTH);
    expect(grid.actionsCell?.pinRight).toBe(true);
    expect(grid.dataColumnCount).toBeLessThanOrEqual(12);
    const { container } = await renderGrid({ view: DEFAULT_VIEW });
    assertAligned(container, grid, sampleRows.length);
    cleanup();
  });
});
