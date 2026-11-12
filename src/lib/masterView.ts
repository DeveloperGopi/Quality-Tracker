/**
 * MASTER VIEW STATE — which columns are visible, their order and the density.
 *
 * Persisted per browser (localStorage) so a district officer keeps their view
 * between visits. Everything here is pure and validated: a stale or corrupt
 * stored view can never break the page (it falls back to the Overview preset).

 */

import {
  COLUMN_BY_KEY,
  COLUMN_PRESETS,
  DEFAULT_VISIBLE_KEYS,
  FROZEN_COLUMN_DEFAULTS,
  GROUP_BY_ID,
  MASTER_COLUMNS,
  REPORT_DEFAULT_KEYS,
  type MasterColumn,
  type MasterGroupId,
} from "@/lib/masterColumns";

export type Density = "compact" | "comfortable";

export type MasterView = {
  presetId: string;
  /** Visible column keys, in the order they were last arranged. */
  visibleKeys: string[];
  /** Explicit drag-reorder of non-pinned columns (subset of visibleKeys). */
  order: string[];
  density: Density;
  /** Group bands the user collapsed. The Facility column always stays. */
  collapsedGroups: MasterGroupId[];
};

export const DEFAULT_VIEW: MasterView = {
  presetId: "overview",
  visibleKeys: [...DEFAULT_VISIBLE_KEYS],
  order: [],
  density: "comfortable",
  collapsedGroups: [],
};

/** The REPORTS page's default view — a separate storage key ("report") with
 *  its own handed-down default set, so dragging columns on one page never
 *  rewrites what the other shows first. Shares the same MasterView rules,
 *  normalizeView / presets / density, and the same "frozen first" ordering. */
export const REPORT_VIEW: MasterView = {
  presetId: "reportDefault",
  visibleKeys: [...REPORT_DEFAULT_KEYS]
    // Addicted from the central config so the frozen columns always lead.
    .filter((k) => COLUMN_BY_KEY[k] !== undefined),
  order: [],
  density: "comfortable",
  collapsedGroups: [],
};

export const STORAGE_PREFIX = "nqas.masterView.";

/** presetId used once the user hand-toggles or reorders columns, so the dialog
 *  stops claiming a named preset is active. */
export const CUSTOM_PRESET_ID = "custom";

/** Row heights per density — ONE place, one fixed height per row. Fixed
 *  heights are a layout contract: the virtualizer's estimateSize, the grid
 *  rows and the cell overflow rules all read these, so long cell content can
 *  never grow a row or stagger it (it clamps + ellipsises instead). */
export const ROW_HEIGHT: Record<Density, number> = {
  compact: 36,
  comfortable: 48,
};

/** The checkbox column is a real column of the grid (never a bolt-on utility
 *  outside the header) — one fixed width, shared by band, header and body. */
export const SELECT_COLUMN_WIDTH = 44;

/** The frozen (sticky) keys in force. The Admin "Table & Display" setting
 *  (0–3 data columns) overrides the config default; an empty array freezes
 *  nothing. Invalid/unknown keys are dropped here, at one gate. */
export function pinnedKeysOf(rawFrozen?: unknown): string[] {
  if (!Array.isArray(rawFrozen)) return [...FROZEN_COLUMN_DEFAULTS];
  const keys = rawFrozen
    .filter(
      (k): k is string =>
        typeof k === "string" &&
        !!COLUMN_BY_KEY[k] &&
        // Only columns that may be frozen — type/block/PHC now live inside
        // the merged Facility cell, so a stale saved setting can't pin them.
        COLUMN_BY_KEY[k].freezeable !== false,
    )
    .slice(0, 3); // hard cap FROZEN_COLUMN_CAP (one constant, max 3)
  // A frozen key that the user hid must still be visible — freezing wins.
  return keys.filter((k) => !COLUMN_BY_KEY[k]?.type?.toString().includes("action"));
}

/** Drop unknown keys, cap the list, and always keep the frozen columns first
 *  and visible.
 *
 *  A hand-arranged view keeps the sentinel preset id "custom" — without this
 *  the saved view came back as "overview" and the column dialog highlighted a
 *  preset the user had actually moved away from. */
export function normalizeView(raw: unknown, pinned: string[] = keysOfConfigPinned()): MasterView {
  const v = (raw ?? {}) as Partial<MasterView>;
  const preset =
    v.presetId === CUSTOM_PRESET_ID
      ? CUSTOM_PRESET_ID
      : (COLUMN_PRESETS.find((p) => p.id === v.presetId)?.id ??
        (v.presetId === "reportDefault" ? "reportDefault" : DEFAULT_VIEW.presetId));

  // A stale stored key may not exist in the config any more — drop it, and
  // only fall back to the DEFAULT columns for the MASTER list (the REPORT
  // page's stored view falls back to ITS default set).
  // Deprecated columns are removed EVERYWHERE — a view saved before the
  // removal silently drops them here (no error, no phantom column).
  const live = (k: string) =>
    !!COLUMN_BY_KEY[k] && !COLUMN_BY_KEY[k].deprecated && COLUMN_BY_KEY[k].hideFromMenu !== true;
  const known = Array.isArray(v.visibleKeys)
    ? v.visibleKeys.filter((k): k is string => typeof k === "string" && live(k))
    : preset === "reportDefault"
      ? [...REPORT_DEFAULT_KEYS]
      : [...DEFAULT_VISIBLE_KEYS];

  const visible = [...pinned.filter(live), ...known.filter((k) => !pinned.includes(k))];
  // De-duplicate (a preset + a manual toggle can collide).
  const seen = new Set<string>();
  const visibleKeys = visible.filter((k) => (seen.has(k) ? false : (seen.add(k), true)));

  const order = (Array.isArray(v.order) ? v.order : []).filter(
    (k): k is string => typeof k === "string" && visibleKeys.includes(k) && !pinned.includes(k),
  );

  const density: Density = v.density === "compact" ? "compact" : "comfortable";
  const collapsedGroups = (Array.isArray(v.collapsedGroups) ? v.collapsedGroups : []).filter(
    (g): g is MasterGroupId =>
      typeof g === "string" && Object.prototype.hasOwnProperty.call(GROUP_BY_ID, g),
  );
  return { presetId: preset, visibleKeys, order, density, collapsedGroups };
}

export function loadMasterView(storageKey: string): MasterView {
  if (typeof window === "undefined") return { ...DEFAULT_VIEW };
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    return normalizeView(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_VIEW };
  }
}

export function saveMasterView(storageKey: string, view: MasterView): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(normalizeView(view)));
  } catch {
    /* private mode / quota — the view simply won't persist */
  }
}

/* --------------------------------------------------------------------------- */
/* Column widths — a user preference, so they come back on the next visit       */
/* --------------------------------------------------------------------------- */

/** Minimum width the resize handle can produce (also the floor when reading a
 *  stored value back: a corrupt or absurd width must not break the grid). */
export const MIN_COLUMN_WIDTH = 60;

const WIDTHS_SUFFIX = ".widths";

/** Drag-resized column widths for a storage key ({} when nothing is saved). */
export function loadColumnWidths(storageKey: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey + WIDTHS_SUFFIX);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const widths: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Number(value);
      // Only real, known columns with a sane width survive. COLUMN_BY_KEY keeps
      // widths for columns that were removed from the config from piling up.
      if (!COLUMN_BY_KEY[key]) continue;
      if (!Number.isFinite(n) || n < MIN_COLUMN_WIDTH) continue;
      widths[key] = Math.round(n);
    }
    return widths;
  } catch {
    return {};
  }
}

export function saveColumnWidths(
  storageKey: string,
  widths: Record<string, number>,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + storageKey + WIDTHS_SUFFIX,
      JSON.stringify(widths),
    );
  } catch {
    /* private mode / quota — the widths simply won't persist */
  }
}

/** One-click preset. */
export function applyPreset(presetId: string, pinned: string[] = keysOfConfigPinned()): MasterView {
  // "reportDefault" is this page's own default key (the "Overview" preset of
  // the Master List must not overwrite what a report starts on).
  if (presetId === "reportDefault") return { ...REPORT_VIEW };
  const preset = COLUMN_PRESETS.find((p) => p.id === presetId) ?? COLUMN_PRESETS[0];
  const valid = pinned.filter((k) => COLUMN_BY_KEY[k]);
  const rest = preset.keys.filter((k) => !valid.includes(k) && COLUMN_BY_KEY[k]);
  return {
    presetId: preset.id,
    visibleKeys: [...valid, ...rest],
    order: [],
    density: DEFAULT_VIEW.density,
    collapsedGroups: [],
  };
}

/** Config default (kept for callers that have not loaded settings yet). */
export function keysOfConfigPinned(): string[] {
  return MASTER_COLUMNS.filter((c) => c.pinned).map((c) => c.key);
}

/**
 * Visible columns in display order: THE FROZEN COLUMNS FIRST (Part D ③.1 —
 * “Type now appears right after Facility”), then the user's drag order, then
 * the config order. `pinned` is the Admin setting's frozen list; when it is
 * omitted the config default applies.
 */
export function orderedVisibleColumns(view: MasterView, pinned: string[] = keysOfConfigPinned()): MasterColumn[] {
  const visible = new Set(view.visibleKeys);
  const frozen = [...new Set(pinned)].filter((k) => COLUMN_BY_KEY[k] && visible.has(k));
  // The action column is NOT a user column: it is a guaranteed trailing
  // utility (the grid builder always appends it, pinned right), so it may
  // never ride the user's visibility list (invisible to hide/reorder/resize).
  const rest = MASTER_COLUMNS.filter(
    (c) =>
      !frozen.includes(c.key) &&
      visible.has(c.key) &&
      c.type !== "action" &&
      !c.deprecated,
  );
  const rank = (key: string) => {
    const i = view.order.indexOf(key);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...frozen.map((k) => COLUMN_BY_KEY[k]), ...rest.sort((a, b) => rank(a.key) - rank(b.key) || 0)];
}

/** Move a column in the user order (used by the drag handle and by the
 *  keyboard-accessible up/down buttons in the Column Manager). Frozen
 *  columns (per the Admin setting) are untouchable — users cannot drag a
 *  column into or out of the frozen zone. */
export function moveColumn(view: MasterView, key: string, to: number, pinned: string[] = keysOfConfigPinned()): MasterView {
  const base = orderedVisibleColumns(view, pinned).map((c) => c.key);
  const rest = base.filter((k) => !pinned.includes(k));
  const from = rest.indexOf(key);
  if (from === -1) return view;
  const next = [...rest];
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, key);
  return { ...view, order: next };
}
