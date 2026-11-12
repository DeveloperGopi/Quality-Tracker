/**
 * MASTER GRID MODEL — the ONE column model behind the Facility Master List
 * table.
 *
 * Every pixel of the grouped table — the group band, the header row and every
 * (virtualized) body row — is generated from `buildMasterGrid()`'s output, so
 * the three rows can never drift apart again:
 *
 *   • the band's `grid-column: span N` equals the number of VISIBLE columns
 *     in that group (recomputed on every show/hide/reorder/resize), and its
 *     width equals the sum of those columns' widths,
 *   • the header cell and every body cell of a column share the SAME template
 *     slot: `template` is one CSS grid-template-columns string applied
 *     verbatim by the component to all three row kinds,
 *   • sticky left pins carry their cumulative `left` offsets in the model,
 *     so the header cell, band cell and body cells of a pinned column agree,
 *   • widths live in ONE place: lib/masterColumns (config `ch` → px), with an
 *     optional per-column resize override applied last (one state change →
 *     the whole template updates at once).
 *
 * Pure + unit-tested (scripts/masterGrid.test.ts) — no React, no DOM.
 */

import {
  COLUMN_BY_KEY,
  GROUP_BY_ID,
  type MasterColumn,
  type MasterGroupId,
} from "@/lib/masterColumns";
import {
  keysOfConfigPinned,
  orderedVisibleColumns,
  ROW_HEIGHT,
  type MasterView,
} from "@/lib/masterView";

export type GridAlign = "left" | "center" | "right";

/** One grid column of the table — checkbox, data column or action column. */
export type GridCellModel = {
  /** The select column is modelled as a real column ("select"), never a row
   *  utility bolted on outside the header definition. */
  kind: "select" | "data";
  key: string;
  label: string;
  group?: MasterGroupId;
  align: GridAlign;
  /** Resolved width in px: resize override > config width × 8. */
  widthPx: number;
  /** Cumulative offset from the left edge of the grid (px). */
  left: number;
  /** Sticky-left pin (matches config `pinned`; the select column always). */
  sticky: boolean;
  /** The row-actions column (always LAST) pins to the RIGHT edge of the
   *  scrollport: `position: sticky; right: 0` on band, header and every body
   *  cell. It is a utility column: not hidden/reordered/resized/exported. */
  pinRight?: boolean;
  /** The config column for data cells (absent for "select"). */
  column?: MasterColumn;
};

export type GridBand = {
  id: MasterGroupId | null;
  label: string;
  /** Number of visible columns this band spans (grid-column: span N). */
  span: number;
  /** 1-based CSS grid line the band STARTS on (the index of its first cell).
   *  The band row is an explicit grid, so this is the only thing that keeps a
   *  label above its own columns — sequential `span N` alone shifted every
   *  band one slot left whenever the checkbox column was shown. */
  start: number;
  widthPx: number;
  /** The band's first cell — sticky when the group opens with pinned columns. */
  left: number;
  sticky: boolean;
  /** TRUE when a previous run of the same group was already labelled — the
   *  band then REPEATS the group name on a lighter background instead of
   *  leaving an unlabelled stretch (frozen runs split a group into two
   *  bands; the user still sees which group each run belongs to). */
  continuation?: boolean;
  /** The row-actions band cell pins right with its columns. */
  pinRight?: boolean;
};

export type MasterGridModel = {
  cells: GridCellModel[];
  /** One grid-template-columns string: the shared layout contract. */
  template: string;
  totalWidth: number;
  rowHeight: number;
  bands: GridBand[];
  /** Visible DATA columns only — the "Columns" counter excludes the checkbox
   *  column and the row-actions utility column ("Update"). */
  dataColumnCount: number;
  /** The (last) row-actions cell — the scroll container reserves
   *  scroll-padding-right for it and the view shows/hides by setting it. */
  actionsCell: GridCellModel | null;
};

/** Fixed width of the guaranteed row-actions column — NOT a `ch`-sized data
 *  column: it never resizes, never reorders, never exports. */
export const ROW_ACTIONS_WIDTH = 92;
/** Edit mode keeps the roomier save/update control; view mode is icon-slim. */
export const EDIT_ROW_ACTIONS_WIDTH = 132;

/** The ACTIONS column — one utility, trailing every view by ONE builder. */
export function actionsCellFor(_view: MasterView, width = ROW_ACTIONS_WIDTH): GridCellModel | null {
  const column = COLUMN_BY_KEY["actions"];
  if (!column) return null;
  return {
    kind: "data",
    key: "actions",
    label: column.label,
    align: "center",
    widthPx: width,
    left: 0,
    sticky: false,
    pinRight: true,
    column,
  };
}

/** Config width (`ch`, one place) → px. */
export function columnWidthPx(
  column: MasterColumn,
  widthOverrides?: Record<string, number>,
): number {
  const override = widthOverrides?.[column.key];
  return override != null
    ? Math.max(60, Math.round(override))
    : Math.max(40, Math.round(column.width * 8));
}

/** Build the complete grid model for a view. One call drives band + header +
 *  every body row; nothing else in the component may hand-write a column. */
export function buildMasterGrid(
  view: MasterView,
  opts: {
    /** Column-resize overrides (px), applied on top of the config widths. */
    widthOverrides?: Record<string, number>;
    /** Frozen data columns (Admin → Table & Display, 0–3), always a prefix. */
    pinnedKeys?: string[];
    /** Freezing active at all? (Per-user "Freeze columns" toggle, AND the
     *  viewport must not be narrower than the Admin "Disable freezing below
     *  (px)" width — mobile uses the card layout anyway.) */
    freezeActive?: boolean;
    /** Admin "Row action column" — Show (default) / Hide; pinRight default ON. */
    actions?: { visible?: boolean; pinRight?: boolean; width?: number };
  } = {},
): MasterGridModel {
  const pinnedKeys = (opts.pinnedKeys ?? keysOfConfigPinned()).filter(Boolean);
  const frozenNow = opts.freezeActive !== false; // default true
  const actions = opts.actions ?? {};
  const collapsed = new Set(view.collapsedGroups ?? []);
  const dataColumns = [...orderedVisibleColumns(view, pinnedKeys)].filter(
    (c) =>
      c.type !== "action" &&
      // A collapsed band hides its columns, but never the Facility identity.
      (!collapsed.has(c.group) || c.key === "facility"),
  );
  const cells: GridCellModel[] = [];
  let left = 0;

  // MASTER LIST (Part 5): there is NO checkbox column any more. Facility is
  // pinned at left: 0 and Facility Type follows it directly, so the table
  // gains the 44 px the select column used to take. Excel/PDF exports never
  // had this column, so their column sets are unchanged.

  // 1 — the visible data columns: frozen keys first, then the user order.
  //     Cumulative sticky offsets start at 0 — the SAME ``left`` the band
  //     cell, the header cell and every body cell of that column carry.
  for (const c of dataColumns) {
    const widthPx = columnWidthPx(c, opts.widthOverrides);
    cells.push({
      kind: "data",
      key: c.key,
      label: c.label,
      group: c.group,
      align: c.align,
      widthPx,
      left,
      sticky: frozenNow && pinnedKeys.includes(c.key),
      column: c,
    });
    left += widthPx;
  }

  // 2b — THE row-actions utility column: ALWAYS the last cell (unless the
  //      Admin has hidden the column). Groups stay off its band, it can't be
  //      hidden/reordered/resized and it pins to the scroll's RIGHT edge.
  const actionsCell = actionsCellFor(view, actions.width);
  const showActions = actions.visible !== false && actionsCell != null;
  if (showActions && actionsCell != null) {
    cells.push({
      ...actionsCell,
      left,
      pinRight: actions.pinRight !== false,
      sticky: false,
      group: undefined,
    });
    left += actionsCell.widthPx;
  }

  // 2 — group band: consecutive columns of a group collapse into one band
  //     cell spanning exactly the number of that group's visible columns.
  //     Every band carries an explicit `start` line, so a label can never sit
  //     one column to the left of the columns it spans.
  const bands: GridBand[] = [];
  const labeledGroups = new Set<MasterGroupId>();
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const last = bands[bands.length - 1];
    // A band cell must stick or scroll exactly like the columns it spans —
    // so a run also breaks whenever the sticky flag changes inside a group
    // (narrow screens pin Facility only, leaving Block/PHC to scroll).
    if (last && last.id === cell.group && last.sticky === cell.sticky && !cell.pinRight) {
      last.span += 1;
      last.widthPx += cell.widthPx;
      continue;
    }
    const group = cell.group ?? null;
    // Every run carries the group name; later runs are marked continuation
    // so the UI paints them lighter (Part 1 ⑤ — "Identity" no longer
    // disappears after the frozen columns).
    const continuation = group != null && labeledGroups.has(group);
    bands.push({
      id: group,
      label: group ? GROUP_BY_ID[group].label : "",
      span: 1,
      start: i + 1,
      widthPx: cell.widthPx,
      left: cell.left,
      sticky: cell.sticky,
      pinRight: cell.pinRight,
      continuation,
    });
    if (group) labeledGroups.add(group);
  }

  const actionKey = actionsCell?.key ?? "actions";
  const template = cells.map((c) => `${c.widthPx}px`).join(" ");
  return {
    cells,
    template,
    totalWidth: left,
    rowHeight: ROW_HEIGHT[view.density],
    bands,
    dataColumnCount: cells.filter(
      (c) => c.kind === "data" && c.column?.type !== "action" && c.key !== actionKey,
    ).length,
    actionsCell: showActions ? (cells[cells.length - 1] ?? null) : null,
  };
}

/** Total width of the frozen zone (checkbox + frozen data columns), px —
 *  used for scroll-padding-left so a focused cell never hides behind the
 *  frozen columns. The frozen zone is a PREFIX of the column order: stop at
 *  the first non-frozen cell. Zero when nothing is frozen. */
export function frozenZoneWidth(grid: MasterGridModel): number {
  let w = 0;
  for (const c of grid.cells) {
    if (c.sticky) w += c.widthPx;
    else break;
  }
  return w;
}

/* --------------------------------------------------------------------------- */
/* Band labels — never a fragment                                              */
/* --------------------------------------------------------------------------- */

/** Rendered width estimate for a band label (11px semibold, ~6.4px/char) plus
 *  its inline inset. Used to pick full → short → dot BEFORE anything clips. */
export function bandLabelWidthPx(text: string, inset = 24): number {
  return Math.round(text.length * 6.4 + inset);
}

/** A continuation run (a group split by the frozen zone) only labels itself
 *  once this much of it is visible. */
export const BAND_MIN_LABEL_PX = 96;

export type BandLabelMode = "full" | "short" | "dot";

export type BandViewport = {
  /** The scroll container's current scrollLeft. */
  scrollLeft: number;
  /** Its client width (a large default in tests / first paint). */
  viewportWidth: number;
  /** Frozen zone the label must stay to the right of. */
  pinnedWidth: number;
};

/** How many px of this band's run the user can actually see (between the
 *  frozen zone and the right edge of the scrollport). */
export function bandVisiblePx(band: GridBand, vp: BandViewport): number {
  const from = Math.max(band.left, vp.scrollLeft + vp.pinnedWidth);
  const to = Math.min(band.left + band.widthPx, vp.scrollLeft + vp.viewportWidth);
  return Math.max(0, to - from);
}

/** Decide the label form from the VISIBLE width: the full group name, the
 *  config shortLabel, or a coloured dot (name in the shared tooltip). A
 *  partial word is never rendered. */
export function bandLabelMode(
  band: GridBand,
  vp: BandViewport,
  shortLabel?: string,
): BandLabelMode {
  if (!band.id) return "dot";
  const visible = bandVisiblePx(band, vp);
  if (band.continuation && visible < BAND_MIN_LABEL_PX) return "dot";
  const inset = 16; // 8px sticky offset + breathing room
  const room = visible - inset;
  if (room >= bandLabelWidthPx(band.label)) return "full";
  if (shortLabel && room >= bandLabelWidthPx(shortLabel, 16)) return "short";
  return "dot";
}
