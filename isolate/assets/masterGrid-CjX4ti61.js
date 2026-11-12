import { cM as DEFAULT_VISIBLE_KEYS, cH as COLUMN_PRESETS, cN as REPORT_DEFAULT_KEYS, cm as GROUP_BY_ID, C as COLUMN_BY_KEY, M as MASTER_COLUMNS } from './AppShell-CP099uvN.js';

const DEFAULT_VIEW = {
  presetId: "overview",
  visibleKeys: [...DEFAULT_VISIBLE_KEYS],
  order: [],
  density: "comfortable",
  collapsedGroups: []
};
const REPORT_VIEW = {
  presetId: "reportDefault",
  visibleKeys: [...REPORT_DEFAULT_KEYS].filter((k) => COLUMN_BY_KEY[k] !== void 0),
  order: [],
  density: "comfortable",
  collapsedGroups: []
};
const STORAGE_PREFIX = "nqas.masterView.";
const CUSTOM_PRESET_ID = "custom";
const ROW_HEIGHT = {
  compact: 36,
  comfortable: 48
};
function normalizeView(raw, pinned = keysOfConfigPinned()) {
  const v = raw ?? {};
  const preset = v.presetId === CUSTOM_PRESET_ID ? CUSTOM_PRESET_ID : COLUMN_PRESETS.find((p) => p.id === v.presetId)?.id ?? (v.presetId === "reportDefault" ? "reportDefault" : DEFAULT_VIEW.presetId);
  const live = (k) => !!COLUMN_BY_KEY[k] && !COLUMN_BY_KEY[k].deprecated && COLUMN_BY_KEY[k].hideFromMenu !== true;
  const known = Array.isArray(v.visibleKeys) ? v.visibleKeys.filter((k) => typeof k === "string" && live(k)) : preset === "reportDefault" ? [...REPORT_DEFAULT_KEYS] : [...DEFAULT_VISIBLE_KEYS];
  const visible = [...pinned.filter(live), ...known.filter((k) => !pinned.includes(k))];
  const seen = /* @__PURE__ */ new Set();
  const visibleKeys = visible.filter((k) => seen.has(k) ? false : (seen.add(k), true));
  const order = (Array.isArray(v.order) ? v.order : []).filter(
    (k) => typeof k === "string" && visibleKeys.includes(k) && !pinned.includes(k)
  );
  const density = v.density === "compact" ? "compact" : "comfortable";
  const collapsedGroups = (Array.isArray(v.collapsedGroups) ? v.collapsedGroups : []).filter(
    (g) => typeof g === "string" && Object.prototype.hasOwnProperty.call(GROUP_BY_ID, g)
  );
  return { presetId: preset, visibleKeys, order, density, collapsedGroups };
}
function loadMasterView(storageKey) {
  if (typeof window === "undefined") return { ...DEFAULT_VIEW };
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    return normalizeView(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_VIEW };
  }
}
function saveMasterView(storageKey, view) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(normalizeView(view)));
  } catch {
  }
}
const MIN_COLUMN_WIDTH = 60;
const WIDTHS_SUFFIX = ".widths";
function loadColumnWidths(storageKey) {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey + WIDTHS_SUFFIX);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const widths = {};
    for (const [key, value] of Object.entries(parsed)) {
      const n = Number(value);
      if (!COLUMN_BY_KEY[key]) continue;
      if (!Number.isFinite(n) || n < MIN_COLUMN_WIDTH) continue;
      widths[key] = Math.round(n);
    }
    return widths;
  } catch {
    return {};
  }
}
function saveColumnWidths(storageKey, widths) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + storageKey + WIDTHS_SUFFIX,
      JSON.stringify(widths)
    );
  } catch {
  }
}
function applyPreset(presetId, pinned = keysOfConfigPinned()) {
  if (presetId === "reportDefault") return { ...REPORT_VIEW };
  const preset = COLUMN_PRESETS.find((p) => p.id === presetId) ?? COLUMN_PRESETS[0];
  const valid = pinned.filter((k) => COLUMN_BY_KEY[k]);
  const rest = preset.keys.filter((k) => !valid.includes(k) && COLUMN_BY_KEY[k]);
  return {
    presetId: preset.id,
    visibleKeys: [...valid, ...rest],
    order: [],
    density: DEFAULT_VIEW.density,
    collapsedGroups: []
  };
}
function keysOfConfigPinned() {
  return MASTER_COLUMNS.filter((c) => c.pinned).map((c) => c.key);
}
function orderedVisibleColumns(view, pinned = keysOfConfigPinned()) {
  const visible = new Set(view.visibleKeys);
  const frozen = [...new Set(pinned)].filter((k) => COLUMN_BY_KEY[k] && visible.has(k));
  const rest = MASTER_COLUMNS.filter(
    (c) => !frozen.includes(c.key) && visible.has(c.key) && c.type !== "action" && !c.deprecated
  );
  const rank = (key) => {
    const i = view.order.indexOf(key);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...frozen.map((k) => COLUMN_BY_KEY[k]), ...rest.sort((a, b) => rank(a.key) - rank(b.key) || 0)];
}
function moveColumn(view, key, to, pinned = keysOfConfigPinned()) {
  const base = orderedVisibleColumns(view, pinned).map((c) => c.key);
  const rest = base.filter((k) => !pinned.includes(k));
  const from = rest.indexOf(key);
  if (from === -1) return view;
  const next = [...rest];
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, key);
  return { ...view, order: next };
}

const ROW_ACTIONS_WIDTH = 92;
const EDIT_ROW_ACTIONS_WIDTH = 132;
function actionsCellFor(_view, width = ROW_ACTIONS_WIDTH) {
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
    column
  };
}
function columnWidthPx(column, widthOverrides) {
  const override = widthOverrides?.[column.key];
  return override != null ? Math.max(60, Math.round(override)) : Math.max(40, Math.round(column.width * 8));
}
function buildMasterGrid(view, opts = {}) {
  const pinnedKeys = (opts.pinnedKeys ?? keysOfConfigPinned()).filter(Boolean);
  const frozenNow = opts.freezeActive !== false;
  const actions = opts.actions ?? {};
  const collapsed = new Set(view.collapsedGroups ?? []);
  const dataColumns = [...orderedVisibleColumns(view, pinnedKeys)].filter(
    (c) => c.type !== "action" && // A collapsed band hides its columns, but never the Facility identity.
    (!collapsed.has(c.group) || c.key === "facility")
  );
  const cells = [];
  let left = 0;
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
      column: c
    });
    left += widthPx;
  }
  const actionsCell = actionsCellFor(view, actions.width);
  const showActions = actions.visible !== false && actionsCell != null;
  if (showActions && actionsCell != null) {
    cells.push({
      ...actionsCell,
      left,
      pinRight: actions.pinRight !== false,
      sticky: false,
      group: void 0
    });
    left += actionsCell.widthPx;
  }
  const bands = [];
  const labeledGroups = /* @__PURE__ */ new Set();
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const last = bands[bands.length - 1];
    if (last && last.id === cell.group && last.sticky === cell.sticky && !cell.pinRight) {
      last.span += 1;
      last.widthPx += cell.widthPx;
      continue;
    }
    const group = cell.group ?? null;
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
      continuation
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
      (c) => c.kind === "data" && c.column?.type !== "action" && c.key !== actionKey
    ).length,
    actionsCell: showActions ? cells[cells.length - 1] ?? null : null
  };
}
function frozenZoneWidth(grid) {
  let w = 0;
  for (const c of grid.cells) {
    if (c.sticky) w += c.widthPx;
    else break;
  }
  return w;
}
function bandLabelWidthPx(text, inset = 24) {
  return Math.round(text.length * 6.4 + inset);
}
const BAND_MIN_LABEL_PX = 96;
function bandVisiblePx(band, vp) {
  const from = Math.max(band.left, vp.scrollLeft + vp.pinnedWidth);
  const to = Math.min(band.left + band.widthPx, vp.scrollLeft + vp.viewportWidth);
  return Math.max(0, to - from);
}
function bandLabelMode(band, vp, shortLabel) {
  if (!band.id) return "dot";
  const visible = bandVisiblePx(band, vp);
  if (band.continuation && visible < BAND_MIN_LABEL_PX) return "dot";
  const inset = 16;
  const room = visible - inset;
  if (room >= bandLabelWidthPx(band.label)) return "full";
  if (shortLabel && room >= bandLabelWidthPx(shortLabel, 16)) return "short";
  return "dot";
}

export { CUSTOM_PRESET_ID as C, DEFAULT_VIEW as D, EDIT_ROW_ACTIONS_WIDTH as E, ROW_ACTIONS_WIDTH as R, applyPreset as a, loadColumnWidths as b, columnWidthPx as c, saveColumnWidths as d, buildMasterGrid as e, frozenZoneWidth as f, bandLabelMode as g, loadMasterView as l, moveColumn as m, normalizeView as n, orderedVisibleColumns as o, saveMasterView as s };
