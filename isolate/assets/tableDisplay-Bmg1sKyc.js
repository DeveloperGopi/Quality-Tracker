import { C as COLUMN_BY_KEY, bk as FROZEN_COLUMN_CAP, cZ as FROZEN_COLUMN_DEFAULTS } from './AppShell-CP099uvN.js';

const DISPLAY_DEFAULTS = {
  frozenColumns: [...FROZEN_COLUMN_DEFAULTS],
  freezeBelowPx: 768,
  recentDays: 1};
function readNumber(raw, fallback, min, max) {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
function readDisplaySettings(raw) {
  const s = raw ?? {};
  let frozenColumns = [...DISPLAY_DEFAULTS.frozenColumns];
  if (Array.isArray(s.frozenColumns)) {
    const keys = s.frozenColumns.filter(
      (k) => typeof k === "string" && !!COLUMN_BY_KEY[k] && COLUMN_BY_KEY[k].type !== "action" && // Type/Block/PHC are merged into the Facility cell now — only the
      // columns the admin may actually freeze survive a stored setting.
      COLUMN_BY_KEY[k].freezeable !== false
    ).filter((k, i, arr) => arr.indexOf(k) === i).slice(0, FROZEN_COLUMN_CAP);
    frozenColumns = keys;
  }
  return {
    frozenColumns,
    freezeBelowPx: readNumber(s.freezeBelowPx, DISPLAY_DEFAULTS.freezeBelowPx, 0, 1920),
    recentDays: readNumber(s.recentlyUpdatedDays, DISPLAY_DEFAULTS.recentDays, 0, 30),
    highlightScope: s.highlightScope === "importsEdits" ? "importsEdits" : "imports"
  };
}
function loadBoolPref(storageKey) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
}
function saveBoolPref(storageKey, on) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, on ? "on" : "off");
  } catch {
  }
}
const FREEZE_PREF_KEY = "nqas.freezeColumns";
const HIGHLIGHT_PREF_KEY = "nqas.highlightUpdates";

export { DISPLAY_DEFAULTS as D, FREEZE_PREF_KEY as F, HIGHLIGHT_PREF_KEY as H, loadBoolPref as l, readDisplaySettings as r, saveBoolPref as s };
