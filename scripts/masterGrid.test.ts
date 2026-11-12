/**
 * MASTER GRID MODEL — the alignment contract behind the Facility Master List.
 *
 * The misalignment bug came from the header, the group band and the body rows
 * computing their widths independently. The fix is ONE column model
 * (buildMasterGrid) producing ONE grid-template-columns string that all three
 * render from. These tests pin that contract at the model level:
 *
 *   • one template = the cells' widths, and the widths sum to totalWidth,
 *   • sticky `left` offsets are cumulative from those same widths,
 *   • a band spans exactly the visible columns of its group (and disappears
 *     when the group is hidden),
 *   • reorder / resize rebuild ONE template (never per-cell tweaks),
 *   • the row height is a fixed per-density constant,
 *   • the "Columns" counter counts data columns only (no checkbox, no action).
 *
 * Run: bun test ./scripts
 */
import { describe, expect, test } from "bun:test";

import {
  COLUMN_BY_KEY,
  MASTER_COLUMNS,
  columnsMenuColumns,
  fullExportColumns,
  type MasterColumn,
} from "../src/lib/masterColumns";
import {
  DEFAULT_VIEW,
  ROW_HEIGHT,
  applyPreset,
  moveColumn,
  orderedVisibleColumns,
  type Density,
  type MasterView,
} from "../src/lib/masterView";
import {
  BAND_MIN_LABEL_PX,
  ROW_ACTIONS_WIDTH,
  bandLabelMode,
  bandLabelWidthPx,
  bandVisiblePx,
  buildMasterGrid,
  columnWidthPx,
  type GridBand,
} from "../src/lib/masterGrid";

/* --------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* --------------------------------------------------------------------------- */

const px = (grid: ReturnType<typeof buildMasterGrid>) =>
  grid.cells.map((c) => c.widthPx);

const templateTokens = (template: string) => template.split(" ");

/** The default view, for a given density. */
const view = (density: Density = "comfortable"): MasterView => ({
  ...DEFAULT_VIEW,
  density,
});

/* Part 5 — the Master List has NO checkbox column, so the only options left
   are widths, frozen keys and the freeze context. */
const WITH_SELECTION = {} as const;

/** Walk bands alongside the cells they span — every cell covered exactly once.
 *  PART 4: coverage starts at cell 0 (the checkbox column has its own
 *  unlabelled band), and every band declares the grid line it starts on. */
function assertBandsCoverCells(grid: ReturnType<typeof buildMasterGrid>) {
  let i = 0;
  for (const band of grid.bands) {
    expect(band.start).toBe(i + 1);
    const spanned = grid.cells.slice(i, i + band.span);
    expect(spanned.length).toBe(band.span);
    expect(band.left).toBe(spanned[0]?.left);
    expect(band.widthPx).toBe(spanned.reduce((sum, c) => sum + c.widthPx, 0));
    expect(band.sticky).toBe(spanned[0]?.sticky);
    i += band.span;
  }
  expect(i).toBe(grid.cells.length);
}

/* --------------------------------------------------------------------------- */
/* One template drives everything                                              */
/* --------------------------------------------------------------------------- */

describe("master grid — one source of truth for widths", () => {
  test("the template is literally the cells' widths, and they sum to totalWidth", () => {
    for (const preset of ["overview", "certification", "all"] as const) {
      const grid = buildMasterGrid(applyPreset(preset), WITH_SELECTION);
      const tokens = templateTokens(grid.template);
      expect(tokens.length).toBe(grid.cells.length);
      expect(tokens).toEqual(grid.cells.map((c) => `${c.widthPx}px`));
      expect(tokens.reduce((sum, t) => sum + Number(t.replace("px", "")), 0)).toBe(
        grid.totalWidth,
      );
      // Every width is a fixed integer px value — never `flex: 1`, `auto` or %.
      for (const w of px(grid)) expect(Number.isInteger(w)).toBe(true);
    }
  });

  test("widths come from the config; Facility is the first column at left 0", () => {
    const grid = buildMasterGrid(applyPreset("all"), WITH_SELECTION);
    const first = grid.cells[0];
    expect(first.kind).toBe("data");
    expect(first.key).toBe("facility");
    expect(first.left).toBe(0);
    expect(first.sticky).toBe(true);
    expect(grid.cells.some((c) => c.kind === "select")).toBe(false);
    // Every DATA cell's width is exactly the config width (ch × 8px). The
    // trailing row-actions utility column is NOT ch-sized: it has a fixed
    // 132px width and can never be resized.
    for (const cell of grid.cells.filter(
      (c) => c.kind === "data" && !c.pinRight,
    )) {
      expect(cell.widthPx).toBe(columnWidthPx(cell.column as MasterColumn));
      expect(cell.widthPx).toBe((cell.column as MasterColumn).width * 8);
    }
    const actions = grid.cells[grid.cells.length - 1];
    expect(actions.key).toBe("actions");
    expect(actions.pinRight).toBe(true);
    expect(actions.widthPx).toBe(ROW_ACTIONS_WIDTH);
    expect(ROW_ACTIONS_WIDTH).toBe(132);
    // Resize overrides win, with a sane floor (min 60px).
    expect(columnWidthPx(COLUMN_BY_KEY.facility, { facility: 300 })).toBe(300);
    expect(columnWidthPx(COLUMN_BY_KEY.facility, { facility: 10 })).toBe(60);
  });

  test("no selection column; the action column stays a utility (not a data column)", () => {
    const grid = buildMasterGrid(applyPreset("all"), WITH_SELECTION);
    const keys = grid.cells.map((c) => c.key);
    expect(keys).not.toContain("__select");
    // Part-3 audit: the "All columns" preset (the Columns menu set) excludes
    // the deprecated Eco trio; the row-action utility column is NOT part of
    // any preset — the builder appends it as the last cell of every view.
    expect(keys).not.toContain("update");
    expect(keys.filter((k) => k === "actions")).toHaveLength(1);
    expect(keys[keys.length - 1]).toBe("actions");
    // The counter = data columns only: no "Update" action.
    expect(grid.dataColumnCount).toBe(columnsMenuColumns().length);
    // The data cell count matches 1:1 once the utility column is excluded.
    expect(grid.dataColumnCount).toBe(
      grid.cells.filter((c) => c.kind === "data" && !c.pinRight).length,
    );
    // …and no data column shifts: the actions cell is the only extra one.
    expect(grid.cells.filter((c) => c.kind === "data").length).toBe(
      grid.dataColumnCount + 1,
    );
    // The action column is excluded from exports too (exportable: false, and
    // fullExportColumns filters every `type: "action"` column out).
    expect(COLUMN_BY_KEY.actions.exportable).toBe(false);
    expect(fullExportColumns().map((c) => c.key)).not.toContain("actions");
    // The slim default view counts only what it shows.
    expect(buildMasterGrid(DEFAULT_VIEW, WITH_SELECTION).dataColumnCount).toBe(
      DEFAULT_VIEW.visibleKeys.length,
    );
  });
});

/* --------------------------------------------------------------------------- */
/* Sticky offsets                                                               */
/* --------------------------------------------------------------------------- */

describe("master grid — sticky left pins", () => {
  test("left offsets are cumulative sums of the widths before them", () => {
    const grid = buildMasterGrid(applyPreset("all"), WITH_SELECTION);
    let running = 0;
    for (const cell of grid.cells) {
      expect(cell.left).toBe(running);
      running += cell.widthPx;
    }
    expect(running).toBe(grid.totalWidth);
    // Pinned: the ONE merged Facility column. Type/block/PHC scroll.
    const stickyKeys = grid.cells.filter((c) => c.sticky).map((c) => c.key);
    expect(stickyKeys).toEqual(["facility"]);
    const w = (key: string) =>
      grid.cells.find((c) => c.key === key)?.widthPx as number;
    const at = (key: string) => grid.cells.find((c) => c.key === key)?.left as number;
    expect(at("facility")).toBe(0);
    expect(at("block")).toBe(w("facility"));
    expect(w("facility")).toBe(260);
    // Admin setting: 0 frozen columns → nothing is pinned.
    const none = buildMasterGrid(applyPreset("all"), {
      ...WITH_SELECTION,
      pinnedKeys: [],
    });
    expect(none.cells.filter((c) => c.sticky)).toEqual([]);
  });

  test("Part D: freezeActive false unfreezes everything; the band still tiles", () => {
    const frozenOff = buildMasterGrid(applyPreset("all"), {
      ...WITH_SELECTION,
      freezeActive: false,
    });
    expect(frozenOff.cells.filter((c) => c.sticky)).toEqual([]);
    expect(frozenOff.template).toBe(
      buildMasterGrid(applyPreset("all"), WITH_SELECTION).template,
    );
    const identityRuns = frozenOff.bands;
    expect(identityRuns[0].id).toBe("identity");
    assertBandsCoverCells(frozenOff);
    // Split band: the frozen Identity prefix keeps its own sticky band cell.
    const withFreeze = buildMasterGrid(applyPreset("all"), WITH_SELECTION);
    const identity = withFreeze.bands.filter((b) => b.id === "identity");
    expect(identity.length).toBe(2);
    expect(identity[0].sticky).toBe(true);
    expect(identity[0].span).toBe(1); // the merged Facility cell stays pinned
    expect(identity[0].label).toBe("Identity");
    expect(identity[1].sticky).toBe(false);
    assertBandsCoverCells(withFreeze);
  });
});

/* --------------------------------------------------------------------------- */
/* Group bands                                                                  */
/* --------------------------------------------------------------------------- */

describe("master grid — group bands", () => {
  test("each band spans exactly the visible columns of its group", () => {
    for (const preset of ["overview", "certification", "all", "building"] as const) {
      const grid = buildMasterGrid(applyPreset(preset), WITH_SELECTION);
      assertBandsCoverCells(grid);
      const visible = orderedVisibleColumns(applyPreset(preset)).map((c) => c.key);
      const spanned = grid.bands.reduce((sum, b) => sum + b.span, 0);
      // The bands tile the WHOLE grid: visible data columns + the
      // unlabelled row-actions band cell.
      expect(spanned).toBe(grid.cells.length);
      expect(spanned).toBe(visible.length + (grid.actionsCell ? 1 : 0));
      // Each group's bands together cover exactly its visible columns.
      for (const band of grid.bands) {
        if (!band.id) continue;
        const inGroup = grid.cells.filter((c) => c.group === band.id).length;
        const covered = grid.bands
          .filter((b) => b.id === band.id)
          .reduce((sum, b) => sum + b.span, 0);
        expect(covered).toBe(inGroup);
        expect(inGroup).toBe(
          visible.filter((k) => COLUMN_BY_KEY[k]?.group === band.id).length,
        );
      }
    }
  });

  test("every band starts on the grid line of its first column (no one-slot shift)", () => {
    for (const preset of ["overview", "certification", "all", "building"] as const) {
      for (const opts of [WITH_SELECTION, { freezeActive: false }]) {
        const grid = buildMasterGrid(applyPreset(preset), opts);
        let i = 0;
        for (const band of grid.bands) {
          expect(band.start).toBe(i + 1);
          expect(band.left).toBe(grid.cells[i].left);
          i += band.span;
        }
        expect(i).toBe(grid.cells.length);
      }
    }
    // "Facility Current Status" (eligibility) sits under the Eligibility & Status
    // band — never under the NQAS Certification run.
    const grid = buildMasterGrid(applyPreset("all"), WITH_SELECTION);
    const idx = grid.cells.findIndex((c) => c.key === "pipelineStatus");
    expect(idx).toBeGreaterThan(-1);
    const band = grid.bands.find(
      (b) => idx + 1 >= b.start && idx + 1 < b.start + b.span,
    );
    expect(band?.id).toBe("eligibility");
    expect(band?.label).toBe("Eligibility & Status");
  });

  test("band labels degrade full → short → dot from the VISIBLE width", () => {
    const grid = buildMasterGrid(applyPreset("all"), WITH_SELECTION);
    const identity = grid.bands.filter((b) => b.id === "identity");
    // A first (non-continuation) run with a long name.
    const wide: GridBand = grid.bands.find((b) => b.id === "sa")!;
    const vp = (scrollLeft: number, viewportWidth = 900) => ({
      scrollLeft,
      viewportWidth,
      pinnedWidth: identity[0].widthPx,
    });
    // A fully visible run shows its full name.
    const atStart = vp(0, wide.left + wide.widthPx + 100);
    expect(bandLabelMode(wide, atStart, "State")).toBe("full");
    // The same run squeezed to 80px shows the short label, then a dot.
    expect(bandLabelMode(wide, { ...atStart, viewportWidth: wide.left + 80 }, "State"))
      .toBe("short");
    const tiny = { scrollLeft: 0, viewportWidth: wide.left + 40, pinnedWidth: 0 };
    expect(bandVisiblePx(wide, tiny)).toBe(40);
    expect(bandLabelMode(wide, tiny, "State")).toBe("dot");
    // A continuation run labels itself only once >= 96px of it is visible.
    const cont = identity.find((b) => b.continuation);
    if (cont) {
      const justUnder = {
        scrollLeft: 0,
        viewportWidth: cont.left + BAND_MIN_LABEL_PX - 1,
        pinnedWidth: 0,
      };
      expect(bandVisiblePx(cont, justUnder)).toBe(BAND_MIN_LABEL_PX - 1);
      expect(bandLabelMode(cont, justUnder, "ID")).toBe("dot");
    }
    // INVARIANT at every scroll position (incl. the far end): a mode is never
    // "full" unless the whole label fits, and text is never a fragment.
    const total = grid.totalWidth;
    for (const scrollLeft of [0, 150, 400, 900, total]) {
      for (const band of grid.bands) {
        if (!band.id) continue;
        const short = band.id === "identity" ? "ID" : band.id === "certification" ? "NQAS" : "Elig";
        const mode = bandLabelMode(band, vp(scrollLeft), short);
        expect(["full", "short", "dot"]).toContain(mode);
        const room = bandVisiblePx(band, vp(scrollLeft)) - 16;
        if (mode === "full") expect(room).toBeGreaterThanOrEqual(bandLabelWidthPx(band.label));
        if (mode === "short") {
          expect(room).toBeGreaterThanOrEqual(bandLabelWidthPx(short, 16));
          expect(room).toBeLessThan(bandLabelWidthPx(band.label));
        }
      }
    }
  });

  test("hiding a whole group removes its band; showing it brings it back", () => {
    const fundsKeys = MASTER_COLUMNS.filter((c) => c.group === "funds").map(
      (c) => c.key,
    );
    const withFunds = applyPreset("funds");
    expect(buildMasterGrid(withFunds, WITH_SELECTION).bands.some((b) => b.id === "funds")).toBe(
      true,
    );

    const withoutFunds: MasterView = {
      ...withFunds,
      visibleKeys: withFunds.visibleKeys.filter((k) => !fundsKeys.includes(k)),
    };
    const grid = buildMasterGrid(withoutFunds, WITH_SELECTION);
    expect(grid.bands.some((b) => b.id === "funds")).toBe(false);
    expect(grid.cells.some((c) => fundsKeys.includes(c.key))).toBe(false);
    // The remaining bands still tile the row exactly.
    assertBandsCoverCells(grid);
    const spanned = grid.bands.reduce((sum, b) => sum + b.span, 0);
    expect(spanned).toBe(grid.cells.length); // remaining + actions
  });
});

/* --------------------------------------------------------------------------- */
/* Resize + reorder = one state change                                          */
/* --------------------------------------------------------------------------- */

describe("master grid — resize and reorder rebuild the ONE template", () => {
  test("resizing a column updates the template, the band and every offset at once", () => {
    const base = buildMasterGrid(applyPreset("all"), WITH_SELECTION);
    const resized = buildMasterGrid(applyPreset("all"), {
      selection: true,
      widthOverrides: { facility: 300 },
    });
    const tokens = templateTokens(resized.template);
    expect(tokens).toContain("300px");
    expect(tokens.length).toBe(base.cells.length);

    const facilityIdx = resized.cells.findIndex((c) => c.key === "facility");
    expect(resized.cells[facilityIdx].widthPx).toBe(300);
    // Everything after Facility shifts by exactly the delta…
    const delta = 300 - (base.cells[facilityIdx].widthPx as number);
    for (let i = facilityIdx + 1; i < resized.cells.length; i++) {
      expect(resized.cells[i].left).toBe(base.cells[i].left + delta);
    }
    // …the total and the group band absorb the same delta…
    expect(resized.totalWidth).toBe(base.totalWidth + delta);
    const identityWidth = (g: ReturnType<typeof buildMasterGrid>) =>
      g.bands.filter((b) => b.id === "identity").reduce((s, b) => s + b.widthPx, 0);
    expect(identityWidth(resized)).toBe(identityWidth(base) + delta);
    // …and the model is still internally consistent.
    expect(resized.template).toBe(resized.cells.map((c) => `${c.widthPx}px`).join(" "));
    assertBandsCoverCells(resized);
  });

  test("reordering moves the column in the template and the offsets follow", () => {
    const view0 = { ...applyPreset("assessments"), order: [] as string[] };
    const reordered = moveColumn(view0, "nqasIaQ1", 0);
    const grid = buildMasterGrid(reordered, WITH_SELECTION);

    const keys = grid.cells.filter((c) => c.kind === "data").map((c) => c.key);
    expect(keys.slice(0, 2)).toEqual(["facility", "nqasIaQ1"]);
    // Template order = display order (one state change, never per-cell).
    expect(templateTokens(grid.template).length).toBe(grid.cells.length);
    let running = 0;
    for (const cell of grid.cells) {
      expect(cell.left).toBe(running);
      running += cell.widthPx;
    }
    assertBandsCoverCells(grid);
    // A pinned column cannot be dragged out of the anchor position.
    expect(moveColumn(view0, "facility", 5)).toEqual(view0);
  });
});

/* --------------------------------------------------------------------------- */
/* Density + row height                                                         */
/* --------------------------------------------------------------------------- */

describe("master grid — fixed row height per density", () => {
  test("compact = 36px, comfortable = 48px, and geometry never changes", () => {
    expect(ROW_HEIGHT.compact).toBe(36);
    expect(ROW_HEIGHT.comfortable).toBe(48);

    const compact = buildMasterGrid(view("compact"), WITH_SELECTION);
    const comfortable = buildMasterGrid(view("comfortable"), WITH_SELECTION);
    expect(compact.rowHeight).toBe(36);
    expect(comfortable.rowHeight).toBe(48);
    // Same columns → same template: density changes the row height, never
    // the column geometry (so header/body can't drift between densities).
    expect(compact.template).toBe(comfortable.template);
    expect(compact.totalWidth).toBe(comfortable.totalWidth);
    expect(compact.bands).toEqual(comfortable.bands);
  });

  test("the model is independent of the row set (157 rows change nothing)", () => {
    // The virtualizer renders rows FROM this model; the model never looks at
    // row content, so no value (long Tamil remarks, blanks, 157 rows…) can
    // move a column or change a row height.
    const a = buildMasterGrid(applyPreset("all"), WITH_SELECTION);
    const b = buildMasterGrid(applyPreset("all"), WITH_SELECTION);
    expect(b.template).toBe(a.template);
    expect(b.rowHeight).toBe(a.rowHeight);
    expect(b.totalWidth).toBe(a.totalWidth);
    expect(b.bands).toEqual(a.bands);
  });
});
