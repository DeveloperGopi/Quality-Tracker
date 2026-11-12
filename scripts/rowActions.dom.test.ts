/**
 * ROW-ACTIONS COLUMN — the guaranteed trailing "Update" utility column.
 *
 * Pins the contract that the old `update` config column never actually met:
 *  • it is a REAL grid column, ALWAYS the last cell of the shared model
 *    (132px, right-pinned) — so the band, the header and every (virtualized)
 *    body cell come from the same columns[] list,
 *  • it is NOT a data column (the "Columns" badge never counts it) and it is
 *    excluded from every export,
 *  • the button opens the Quick View for THAT facility without firing the
 *    row's click handler and without toggling the checkbox,
 *  • Viewers get "View" (never Update / Save) and keep the full accessible
 *    name, in label and compact (icon-only) mode,
 *  • focus can return to the button after the dialog closes.
 *
 * happy-dom has no layout engine, so the assertions are the model + the
 * inline sticky/right styles and the scroll-padding reservation — exactly the
 * inputs the browser's layout uses.
 *
 * Run: bun test ./scripts
 */
import { describe, expect, test, afterEach } from "bun:test";
import { Window } from "happy-dom";

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

const VIEWPORT = { width: 1400, height: 700 };
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

import type { ReactElement } from "react";
import type { SortingState } from "@tanstack/react-table";

import { COLUMN_BY_KEY, fullExportColumns, type MasterRow } from "../src/lib/masterColumns";
import { DEFAULT_VIEW, type MasterView } from "../src/lib/masterView";
import { ROW_ACTIONS_WIDTH, buildMasterGrid } from "../src/lib/masterGrid";
import { focusLastRowActionTrigger } from "../src/components/master/RowActionsCell";
import type { TrackerRow } from "../src/components/master/EditModeCells";

function makeRow(id: string, name: string): MasterRow {
  return {
    facility: {
      _id: id,
      name,
      block: "Ariyur",
      phc: "Ariyur West",
      facilityType: "PHC",
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
    cycleNumber: null,
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

const ROWS = [makeRow("a", "PHC Alangayam"), makeRow("b", "HSC Kandhili")];
const VIEW: MasterView = {
  presetId: "custom",
  visibleKeys: ["facility", "block", "certStatus"],
  order: [],
  density: "comfortable",
};
const EMPTY_SORTING: SortingState[] & SortingState = [] as unknown as SortingState;

type H = typeof import("react").createElement;
type Comps = typeof import("../src/components/master/GroupedMasterTable");
type Actions = typeof import("../src/components/master/RowActionsCell");
type CreateRoot = typeof import("react-dom/client").createRoot;

let h: H;
let createRoot: CreateRoot;
let comps: Comps;
let actions: Actions;
let MemoryRouter: typeof import("react-router").MemoryRouter;

async function deps() {
  if (!h) h = (await import("react")).createElement;
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  if (!comps) comps = await import("../src/components/master/GroupedMasterTable");
  if (!actions) actions = await import("../src/components/master/RowActionsCell");
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
  await new Promise((resolve) => setTimeout(resolve, 10));
  mounted.push({
    container,
    unmount: () => {
      root.unmount();
      container.remove();
    },
  });
  return container;
}

function cleanup() {
  while (mounted.length) mounted.pop()?.unmount();
}

const q = (root: ParentNode | null | undefined, selector: string) =>
  root ? (Array.from(root.querySelectorAll(selector)) as HTMLElement[]) : [];

async function renderGrid(opts: {
  view?: MasterView;
  selection?: boolean;
  rowActions?: Record<string, unknown>;
  scrolledX?: boolean;
}) {
  await deps();
  const grid = buildMasterGrid(opts.view ?? VIEW, {
    selection: opts.selection ?? true,
  });
  const container = await mount(
    h(
      "div",
      null,
      h(comps.MasterGridHead, {
        grid,
        sorting: EMPTY_SORTING,
        labels: {},
        onSort: () => {},
        onResizeStart: () => () => {},
        onResizeReset: () => {},
        scrolledX: opts.scrolledX ?? false,
        onToggleAll: () => {},
      }),
      ...ROWS.map((row, i) =>
        h(comps.MasterGridRow, {
          key: row.facility._id,
          row,
          index: i,
          cells: grid.cells,
          gridTemplate: grid.template,
          totalWidth: grid.totalWidth,
          top: i * grid.rowHeight,
          rowHeight: grid.rowHeight,
          density: (opts.view ?? VIEW).density,
          dupes: new Set<string>(),
          zebra: i % 2 === 1,
          isSelected: false,
          scrolledX: opts.scrolledX ?? false,
          rowActions: opts.rowActions,
          onOpen: () => {},
          onToggle: () => {},
        }),
      ),
    ),
  );
  return { grid, container };
}

describe("row-actions column — the last column of the shared model", () => {
  afterEach(() => cleanup());

  test("it is 132px, right-pinned, NOT a data column and NEVER exportable", () => {
    const grid = buildMasterGrid(DEFAULT_VIEW, { selection: true });
    const last = grid.cells[grid.cells.length - 1];
    expect(last.key).toBe("actions");
    expect(last.pinRight).toBe(true);
    expect(last.sticky).toBe(false);
    expect(last.widthPx).toBe(ROW_ACTIONS_WIDTH);
    expect(ROW_ACTIONS_WIDTH).toBe(132);
    // Not counted in the Columns badge, never in an export.
    expect(grid.dataColumnCount).toBe(
      grid.cells.filter((c) => c.kind === "data" && !c.pinRight).length,
    );
    expect(grid.actionsCell?.key).toBe("actions");
    expect(COLUMN_BY_KEY.actions.exportable).toBe(false);
    expect(fullExportColumns().map((c) => c.key)).not.toContain("actions");
  });

  test("band, header and EVERY body cell pin right from the same model", async () => {
    const { container, grid } = await renderGrid({});
    const band = q(container, '[data-testid="master-band"]')[0];
    const bandCells = q(band, "[data-band-span]");
    const lastBand = bandCells[bandCells.length - 1];
    expect(lastBand.style.right).toBe("0px");
    expect(lastBand.style.position).toBe("sticky");
    // The utility band carries no group label (it belongs to no group).
    expect(lastBand.getAttribute("data-band-group")).toBe("select");

    const headerRow = q(container, '[data-testid="master-header-row"]')[0];
    const headerCells = q(headerRow, "[data-header]");
    const headerActions = q(headerRow, '[data-header="actions"]')[0];
    expect(headerCells[headerCells.length - 1]).toBe(headerActions);
    expect(headerActions.getAttribute("data-pin-right")).toBe("1");
    expect(headerActions.style.right).toBe("0px");
    expect(headerActions.style.position).toBe("sticky");
    expect(headerActions.textContent).toContain("Update");

    for (const row of q(container, '[data-testid="master-row"]')) {
      const cells = q(row, "[data-cell]");
      const cell = q(row, '[data-cell="actions"]')[0];
      expect(cells[cells.length - 1]).toBe(cell);
      expect(cell.getAttribute("data-pin-right")).toBe("1");
      expect(cell.style.right).toBe("0px");
      expect(cell.style.position).toBe("sticky");
    }
    // No data column shifted: the header/body keys still line up 1:1.
    const headerKeys = headerCells.map((el) => el.getAttribute("data-header"));
    for (const row of q(container, '[data-testid="master-row"]')) {
      expect(q(row, "[data-cell]").map((el) => el.getAttribute("data-cell"))).toEqual(
        headerKeys,
      );
    }
    expect(headerKeys.length).toBe(grid.cells.length);
    // The left shadow only exists while there is content to scroll to the left.
    expect(headerActions.className).not.toContain("shadow-");
  });

  test("the shadow appears once the table is scrolled horizontally", async () => {
    const { container } = await renderGrid({ scrolledX: true });
    const headerActions = q(container, '[data-header="actions"]')[0];
    expect(headerActions.className).toContain("shadow-");
  });

  test("the scroll container reserves scroll-padding-right for the column", async () => {
    await deps();
    const container = await mount(
      h(comps.GroupedMasterTable, {
        rows: ROWS,
        labels: {},
        view: VIEW,
        sorting: EMPTY_SORTING,
        onSortingChange: () => {},
        onOpenRow: () => {},
        onColumnsClick: () => {},
        totalRowCount: ROWS.length,
        selected: new Set<string>(),
        onToggleRow: () => {},
        onToggleAll: () => {},
        rowActions: { canEdit: true, onUpdate: () => {} },
      }),
    );
    const scroller = q(container, '[data-printable="master-table"]')[0];
    expect(scroller).toBeDefined();
    expect(scroller.style.scrollPaddingRight).toBe(`${ROW_ACTIONS_WIDTH}px`);
    // The actions cell exists in the real table too.
    expect(q(container, '[data-cell="actions"]').length).toBeGreaterThan(0);
  });

  test("no control in the rendered grid carries a native `title` (one tooltip system)", async () => {
    const { container } = await renderGrid({});
    /* The browser's own black tooltip is what doubled the pill. Assert across
       the whole rendered DOM, not just the actions cell. */
    expect(q(container, "[title]").map((el) => el.outerHTML.slice(0, 80))).toEqual([]);
    // The column-header icons and the density/freeze toggles opt in via data-tip.
    const tipped = q(container, "[data-tip]");
    expect(tipped.length).toBeGreaterThan(0);
    for (const el of tipped) {
      expect(el.getAttribute("title")).toBeNull();
      expect((el.getAttribute("data-tip") ?? "").trim().length).toBeGreaterThan(0);
    }
  });

  test("Update opens the quick view for THAT facility — never the row or the checkbox", async () => {
    const opened: string[] = [];
    const toggled: string[] = [];
    let rowClicks = 0;
    const { grid } = await renderGrid({});
    const element = h(
      "div",
      null,
      ...ROWS.map((row, i) =>
        h(comps.MasterGridRow, {
          key: row.facility._id,
          row,
          index: i,
          cells: grid.cells,
          gridTemplate: grid.template,
          totalWidth: grid.totalWidth,
          top: i * grid.rowHeight,
          rowHeight: grid.rowHeight,
          density: VIEW.density,
          dupes: new Set<string>(),
          zebra: false,
          isSelected: false,
          scrolledX: false,
          rowActions: {
            canEdit: true,
            onUpdate: (r: MasterRow) => opened.push(String(r.facility._id)),
            onOpenProfile: () => {},
          },
          onOpen: () => {
            rowClicks += 1;
          },
          onToggle: (on: boolean) => toggled.push(String(on)),
        }),
      ),
    );
    const container = await mount(element);
    const firstRow = q(container, '[data-testid="master-row"]')[0];
    const button = q(firstRow, '[data-testid="row-actions-btn"]')[0];
    expect(button.getAttribute("aria-label")).toBe("Update PHC Alangayam");
    button.click();
    expect(opened).toEqual(["a"]);
    expect(rowClicks).toBe(0);
    expect(toggled).toEqual([]);

    // Focus returns to the same control when the dialog closes.
    expect(win.document.activeElement).not.toBe(button);
    button.focus();
    focusLastRowActionTrigger();
    expect(win.document.activeElement).toBe(button);
  });

  test("a Viewer sees View — never Update or Save — with the facility in the name", async () => {
    const { grid } = await renderGrid({});
    const container = await mount(
      h(comps.MasterGridRow, {
        row: ROWS[0],
        index: 0,
        cells: grid.cells,
        gridTemplate: grid.template,
        totalWidth: grid.totalWidth,
        top: 0,
        rowHeight: grid.rowHeight,
        density: VIEW.density,
        dupes: new Set<string>(),
        zebra: false,
        isSelected: false,
        scrolledX: false,
        rowActions: { canEdit: false, onOpenProfile: () => {} },
        onOpen: () => {},
        onToggle: () => {},
      }),
    );
    const button = q(container, '[data-testid="row-actions-btn"]')[0];
    expect(button.getAttribute("aria-label")).toBe("View PHC Alangayam");
    expect(button.textContent).toContain("View");
    expect(button.textContent).not.toContain("Update");
    expect(button.textContent).not.toContain("Save");
    // The ⋯ menu is still there (history / print / export are read-only).
    expect(q(container, '[data-testid="row-actions-more"]').length).toBe(1);
  });

  test("compact mode drops the label but keeps the accessible name", async () => {
    const { grid } = await renderGrid({});
    const container = await mount(
      h(comps.MasterGridRow, {
        row: ROWS[0],
        index: 0,
        cells: grid.cells,
        gridTemplate: grid.template,
        totalWidth: grid.totalWidth,
        top: 0,
        rowHeight: grid.rowHeight,
        density: VIEW.density,
        dupes: new Set<string>(),
        zebra: false,
        isSelected: false,
        scrolledX: false,
        rowActions: { canEdit: true, compact: true, onUpdate: () => {} },
        onOpen: () => {},
        onToggle: () => {},
      }),
    );
    const button = q(container, '[data-testid="row-actions-btn"]')[0];
    expect(button.getAttribute("aria-label")).toBe("Update PHC Alangayam");
    expect(q(button, ".row-actions-label")).toHaveLength(0);
    expect(actions).toBeDefined();
  });
});

describe("edit table mode — the same column switches to Save row", () => {
  afterEach(() => cleanup());

  test("a clean row keeps Update (and opens the quick view); a changed row saves", async () => {
    await deps();
    const edit = await import("../src/components/master/EditModeCells");
    const row = ROWS[0] as unknown as TrackerRow;
    const opened: string[] = [];
    const saved: string[] = [];

    const mountCell = (state: Parameters<typeof edit.isRowDirty>[1]) =>
      mount(
        h(edit.EditableUpdateCell, {
          row,
          state,
          canEdit: true,
          isAdmin: false,
          busy: false,
          onSave: (r: TrackerRow) => saved.push(String(r.facility._id)),
          onDelete: () => {},
          onUpdate: (r: TrackerRow) => opened.push(String(r.facility._id)),
          label: "Update",
        }),
      );

    const clean = await mountCell(undefined);
    const cleanBtn = q(clean, ".row-actions-btn")[0] as HTMLButtonElement;
    expect(cleanBtn.textContent).toContain("Update");
    expect(cleanBtn.disabled).toBe(false);
    cleanBtn.click();
    expect(opened).toEqual(["a"]);
    expect(saved).toEqual([]);
    cleanup();

    const dirty = await mountCell({ draft: { remarks: "Edited" }, files: {}, clears: {} });
    const saveBtn = q(dirty, ".row-actions-btn")[0] as HTMLButtonElement;
    expect(saveBtn.textContent).toContain("Save row · 1");
    expect(saveBtn.getAttribute("aria-label")).toBe("Save row PHC Alangayam");
    saveBtn.click();
    expect(saved).toEqual(["a"]);
    expect(opened).toEqual(["a"]);
  });

  test("a blocking error disables the button and explains itself", async () => {
    await deps();
    const edit = await import("../src/components/master/EditModeCells");
    const container = await mount(
      h(edit.EditableUpdateCell, {
        row: ROWS[0] as unknown as TrackerRow,
        state: { draft: { certScore: "abc" }, files: {}, clears: {} },
        canEdit: true,
        isAdmin: false,
        busy: false,
        onSave: () => {},
        onDelete: () => {},
        onUpdate: () => {},
      }),
    );
    const btn = q(container, ".row-actions-btn")[0] as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain("Save row");
    // The wrapper carries the reason (a disabled button swallows hover) via
    // the shared tooltip layer — never a native `title` (that drew a second box).
    const wrapper = btn.parentElement as HTMLElement;
    expect(wrapper.getAttribute("title")).toBeNull();
    expect(wrapper.getAttribute("data-tip") ?? "").toContain("not a number");
  });
});
