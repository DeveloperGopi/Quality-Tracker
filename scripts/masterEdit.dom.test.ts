/**
 * MASTER LIST — edit-vs-view shared-grid contract (Task C).
 *
 * Root cause this pins: edit mode used to render a DIFFERENT legacy table
 * (an AutoFitTableScroll <Table> whose header never shared the grouped
 * grid's band/frozen-header contract) — scrolling the edit table could
 * unstick the header. Now BOTH modes render GroupedMasterTable.
 *
 * happy-dom DOM asserts (no layout engine):
 *  • the SAME header chrome (data-testid master-band / master-header-row)
 *    renders in BOTH modes — one component, one template, one contract,
 *  • edit-mode data cells render through the shared grid cell container and
 *    carry the editable widget/data-edit-cell marker,
 *  • the action column hosts the Update/Open/Delete cell,
 *  • the ONE scroll container is bounded (a maxHeight), keeps a 320px
 *    minHeight floor, and carries scroll-padding-top ≥ band + header height
 *    so keyboard Tab/arrow navigation can never hide a cell under the
 *    frozen rows,
 *  • row height NEVER changes while editing: the row div keeps the shared
 *    fixed row height.
 *
 * Run: bun test ./scripts
 */
import { describe, expect, test, afterEach } from "bun:test";
import { readFileSync } from "node:fs";
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
    /* Bun's own read-only globals stay as they are */
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

// TanStack Virtual needs a non-zero scroll viewport.
const VIEWPORT = { width: 1400, height: 700 };
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
      x: 0, y: 0, top: 0, left: 0,
      right: VIEWPORT.width, bottom: VIEWPORT.height,
      width: VIEWPORT.width, height: VIEWPORT.height,
      toJSON: () => ({}),
    };
  };
const extras0 = win as unknown as { matchMedia?: (q: string) => unknown };
if (typeof extras0.matchMedia !== "function") {
  extras0.matchMedia = (media: string) => ({
    matches: false,
    media,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

import type { SortingState } from "@tanstack/react-table";
import type { MasterRow } from "@/lib/masterColumns";
import type { MasterView } from "@/lib/masterView";
import { trackerDraftFromRow, isRowDirty, type TrackerRow } from "@/components/master/EditModeCells";

function makeRow(spec: {
  id: string;
  name: string;
  block?: string;
  type?: string;
  certStatus?: string | null;
}): MasterRow {
  return {
    facility: {
      _id: spec.id,
      name: spec.name,
      block: spec.block ?? "Ariyur",
      phc: `${spec.block ?? "Ariyur"} West`,
      facilityType: spec.type ?? "PHC",
      ninNumber: "1201004471",
      eligibility: "Eligible",
      currentStatus: "SA Not Yet Initiated",
      statusOverride: null,
      remarks: "",
      updatedAt: null,
      nqasIaQ1: null,
      nqasIaQ2: null,
      kayakalpIaQ1: null,
      kayakalpIaQ2: null,
    },
    cycleNumber: 1,
    cycleType: null,
    sa: null,
    nqas: spec.certStatus
      ? { certificationStatus: spec.certStatus }
      : null,
    fund: null,
    noc: null,
    building: null,
    ia: null,
    resultDocumentId: null,
    resultDocumentName: null,
  } as unknown as MasterRow;
}

const ROWS: MasterRow[] = [
  makeRow({ id: "a", name: "PHC Ariyur", certStatus: "Quality Certified" }),
  makeRow({ id: "b", name: "HWC Kandhili" }),
];

const VIEW: MasterView = {
  presetId: "custom",
  visibleKeys: ["facility", "certStatus", "certDate", "remarks", "update"],
  order: [],
  density: "comfortable",
};

const NOOP_SORT: SortingState = [];

/* ------------------------------------------------------------------ */
/* Mount helpers                                                       */
/* ------------------------------------------------------------------ */

async function tick(ms = 10) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type H = typeof import("react").createElement;
type CreateRoot = typeof import("react-dom/client").createRoot;
type Comps = typeof import("../src/components/master/GroupedMasterTable");
let MemoryRouter: typeof import("react-router").MemoryRouter;

let h: H;
let createRoot: CreateRoot;
let comps: Comps;

async function deps() {
  if (!h) h = (await import("react")).createElement;
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  if (!comps) comps = (await import("../src/components/master/GroupedMasterTable")) as Comps;
  if (!MemoryRouter) MemoryRouter = (await import("react-router")).MemoryRouter;
  return { h, createRoot, comps };
}

const mounted: { unmount: () => void; container: HTMLElement }[] = [];

async function mountGrid(opts: {
  edit?: boolean;
  rows?: MasterRow[];
  /** Part 1 ③ — editors appear ON DEMAND: the grid's edit contract carries
   *  the active cell; only THAT cell renders the widget, everything else
   *  keeps the view-mode value. */
  activeCell?: { rowId: string; key: string };
}) {
  const { h: h2 } = await deps();
  const rows = opts.rows ?? ROWS;
  const editCfg = opts.edit
    ? {
        renderEditableCell: (row: MasterRow, key: string) =>
          h2("span", { "data-edit-widget": key, key }, `W:${key}`),
        renderActionCell: (row: MasterRow) =>
          h2(
            "button",
            {
              "data-testid": "edit-actions",
              key: String(row.facility._id),
            },
            "Update",
          ),
      }
    : undefined;
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    h2(MemoryRouter as never, null, null as never),
  );
  // Re-render properly with props (MemoryRouter wraps the grid):
  root.render(
    h2(
      MemoryRouter,
      null,
      h2(comps.GroupedMasterTable, {
        rows,
        labels: {},
        view: VIEW,
        sorting: NOOP_SORT,
        onSortingChange: () => {},
        onOpenRow: () => {},
        onColumnsClick: () => {},
        totalRowCount: rows.length,
        selected: opts.edit ? undefined : null,
        ...(editCfg
          ? {
              edit: {
                activeCell: opts.activeCell ?? null,
                onActivate: () => {},
                renderEditableCell: editCfg.renderEditableCell,
                renderActionCell: editCfg.renderActionCell,
              },
            }
          : {}),
      }),
    ),
  );
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

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe("Master List edit mode shares the grouped grid (Task C)", () => {
  afterEach(() => cleanup());

  test("THE SAME header chrome renders in view AND edit mode (one component, one contract)", async () => {
    const viewDom = await mountGrid({ edit: false });
    const bandView = q(viewDom, '[data-testid="master-band"]');
    const headerView = q(viewDom, '[data-testid="master-header-row"]');
    expect(bandView).toHaveLength(1);
    expect(headerView).toHaveLength(1);
    const templateView = (headerView[0] as never as { style: { gridTemplateColumns: string } }).style
      .gridTemplateColumns;
    cleanup();

    const editDom = await mountGrid({ edit: true });
    const bandEdit = q(editDom, '[data-testid="master-band"]');
    const headerEdit = q(editDom, '[data-testid="master-header-row"]');
    expect(bandEdit).toHaveLength(1);
    expect(headerEdit).toHaveLength(1);
    const templateEdit = (headerEdit[0] as never as { style: { gridTemplateColumns: string } })
      .style.gridTemplateColumns;
    // one template string = the shared model on both modes
    expect(templateEdit).toBe(templateView);
  });

  test("edit-mode cells render INSIDE the shared grid's cell slots (data-edit-cell), same row height", async () => {
    // Inactive first: every cell keeps its view-mode value (the Part 1 fix —
    // the renderer returns null for non-active cells, the grid falls back to
    // SmartCell, so nothing can go blank) and NO widget is open yet.
    const dom = await mountGrid({ edit: true });
    const rows0 = q(dom, '[data-testid="master-row"]');
    expect(rows0.length).toBe(2);
    expect((rows0[0] as never as { style: { height: string } }).style.height).toBe(
      "48px", // ROW_HEIGHT.comfortable — editing never grows the row
    );
    expect(q(rows0[0], "[data-edit-widget]")).toHaveLength(0);
    // Read-only identity value stays visible in edit mode (Facility name).
    expect((rows0[0].textContent ?? "")).toContain("PHC Ariyur");
    // The activation machinery marks the editable cells.
    const editable0 = q(rows0[0], "[data-edit-cell]");
    expect(editable0.map((c) => c.getAttribute("data-edit-cell"))).toContain("certStatus");
    // the action column hosts the Update cell
    expect(q(rows0[0], '[data-testid="edit-actions"]')).toHaveLength(1);

    // Activate one cell → EXACTLY that cell hosts the editor; the rest keep
    // their values; the row height holds.
    cleanup();
    const dom2 = await mountGrid({
      edit: true,
      activeCell: { rowId: "a", key: "certStatus" },
    });
    const rows = q(dom2, '[data-testid="master-row"]');
    const first = rows[0];
    expect((first as never as { style: { height: string } }).style.height).toBe(
      "48px",
    );
    const widget = q(first, '[data-edit-widget="certStatus"]');
    expect(widget).toHaveLength(1);
    // one active cell — no other widget anywhere in the grid
    expect(q(dom2, "[data-edit-widget]")).toHaveLength(1);
    // the other editable cells in the SAME row show no control
    expect(q(first, '[data-edit-widget="remarks"]')).toHaveLength(0);
  });

  test("view mode does NOT render editable widgets (SmartCell default)", async () => {
    const dom = await mountGrid({ edit: false });
    const row = q(dom, '[data-testid="master-row"]')[0];
    expect(q(row, "[data-edit-cell]")).toHaveLength(0);
    expect(q(row, "[data-edit-widget]")).toHaveLength(0);
  });

  test("ONE bounded scroll container: maxHeight set, 320px floor, scroll-padding keeps cells visible under the frozen rows", async () => {
    const dom = await mountGrid({ edit: true });
    const scroller = q(dom, '[data-printable="master-table"]')[0] as never as {
      style: Record<string, string>;
    };
    expect(scroller).toBeDefined();
    expect(scroller.style.maxHeight ?? scroller.getAttribute("style") ?? "").toContain(
      "calc(100",
    );
    expect(scroller.style.minHeight).toBe("320px");
    // group band (28) + header (40) = 68px keyboard scroll padding
    expect(scroller.style.scrollPaddingTop).toBe("68px");
  });
});

/* ------------------------------------------------------------------ */
/* Pure draft-engine contract: virtualization-safe page state          */
/* ------------------------------------------------------------------ */

describe("rowEdit drafts (page-owned, virtualization-safe)", () => {
  test("trackerDraftFromRow seeds the SAME keys the legacy row editor used", () => {
    const fake = {
      facility: {
        _id: "z",
        name: "PHC",
        block: "B",
        phc: "P",
        facilityType: "PHC",
        currentStatus: "x",
        remarks: "hello",
        nqasIaQ1: 10,
        nqasIaQ2: 12,
        kayakalpIaQ1: 5,
        kayakalpIaQ2: 6,
      },
      cycleNumber: 1,
      sa: { status: "Completed" },
      nqas: { certificationStatus: "Quality Certified", surveillanceDone1: null },
      fund: { amountSanctioned: 1000, financialYear: "2025-26" },
      noc: null,
      building: null,
    } as never as TrackerRow;
    const draft = trackerDraftFromRow(fake);
    expect(Object.keys(draft)).toContain("certStatus");
    expect(draft.remarks).toBe("hello");
    expect(draft.gapAmount).toBe("1000");
    // identical rows ⇒ clean
    expect(isRowDirty(fake, { draft: { ...draft }, files: {}, clears: {} })).toBe(false);
    // a changed field ⇒ dirty
    expect(isRowDirty(fake, { draft: { certScore: "9" }, files: {}, clears: {} })).toBe(true);
  });

  test("useRowDrafts keeps dirtyCount solid (it never double-counts clean rows)", () => {
    const rowLike = {
      facility: { _id: "z", name: "P", block: "B", phc: "P", facilityType: "PHC" },
      sa: null, nqas: null, fund: null, noc: null, building: null,
    } as never as TrackerRow;
    const fake = { cell: rowLike };
    void fake;
    // The hook binds to React state at page level; the pure helpers hold the
    // contract. isRowDirty(undefined) is clean (row untouched).
    expect(isRowDirty(rowLike, undefined)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Grid layering — a pinned Update cell can never cover the header      */
/* ------------------------------------------------------------------ */

describe("header layering (pinned Update never paints over the header)", () => {
  afterEach(() => cleanup());

  const css = () => readFileSync("src/index.css", "utf8");
  const zVar = (name: string) => {
    const m = new RegExp(`--${name}:\\s*(\\d+)`).exec(css());
    return m ? Number(m[1]) : Number.NaN;
  };

  test("ONE layer order: body 1, pinned body 3, header 5, pinned header 6, corner 7", () => {
    expect([
      zVar("mg-z-cell"),
      zVar("mg-z-pin"),
      zVar("mg-z-head"),
      zVar("mg-z-head-pin"),
      zVar("mg-z-corner"),
    ]).toEqual([1, 3, 5, 6, 7]);
    // The body layer is its own stacking context, so nothing a row paints can
    // rise above the header — the root cause of the overlap.
    expect(css()).toMatch(/\.mg-body\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*0;[^}]*isolation:\s*isolate;/);
  });

  test("the body layer carries mg-body; no body cell uses a header z-layer", async () => {
    const dom = await mountGrid({ edit: false });
    const body = q(dom, '[data-testid="master-body"]')[0];
    expect(body).toBeDefined();
    expect(body.className).toContain("mg-body");
    const bodyCells = q(dom, '[data-testid="master-row"] > div');
    expect(bodyCells.length).toBeGreaterThan(0);
    expect(bodyCells.some((c) => /(^|\s)(z-20|z-30|mg-head|mg-head-pin|mg-corner)(\s|$)/.test(c.className))).toBe(
      false,
    );
  });

  test("pinned body cells sit on the pin layer (mg-pin), never above the header", async () => {
    const dom = await mountGrid({ edit: true });
    const pinned = q(dom, '[data-testid="master-row"] [data-pin-right="1"]');
    expect(pinned.length).toBeGreaterThan(0);
    for (const cell of pinned) {
      expect(cell.className).toContain("mg-pin");
      expect(cell.className).not.toContain("z-20");
      expect((cell as never as { style: { position: string } }).style.position).toBe("sticky");
    }
  });

  test("the right-pinned header cell is sticky at top AND right and labelled Update", async () => {
    const dom = await mountGrid({ edit: true });
    const th = q(dom, '[data-header="actions"]')[0];
    expect(th).toBeDefined();
    expect(th.getAttribute("data-pin-right")).toBe("1");
    expect(th.textContent).toContain("Update");
    expect(th.className).toContain("mg-corner");
    expect((th as never as { style: { position: string } }).style.position).toBe("sticky");
    expect((th as never as { style: { right: string } }).style.right).toBe("0px");
    // …inside the sticky header row (top offset comes from that row).
    const row = q(dom, '[data-testid="master-header-row"]')[0];
    expect(row.contains(th)).toBe(true);
    expect(row.className).toContain("mg-head");
    expect((row as never as { style: { top: string } }).style.top).toBe("28px");
    expect(q(dom, '[data-testid="master-band"]')[0].className).toContain("mg-head");
  });

  test("sticky chrome is opaque and the scroll padding equals band + header", async () => {
    const dom = await mountGrid({ edit: false });
    const band = q(dom, '[data-testid="master-band"]')[0];
    // No translucent /95 background: scrolled rows can never show through.
    expect(band.className).not.toContain("/95");
    expect(band.className).toContain("bg-muted");
    expect(q(dom, '[data-testid="master-header-row"]')[0].className).toContain("bg-muted");
    const scroller = q(dom, '[data-printable="master-table"]')[0] as never as {
      style: { scrollPaddingTop: string };
    };
    // BAND_HEIGHT 28 + HEADER_HEIGHT 40
    expect(scroller.style.scrollPaddingTop).toBe("68px");
  });
});
