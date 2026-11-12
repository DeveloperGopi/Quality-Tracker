/**
 * TABLE & DISPLAY ADMIN SETTINGS (Parts C · D) — the pure reader that turns
 * the raw appSettings rows into the shape the master list and Admin UI use.
 *
 * Keys (Part E):
 *   recentlyUpdatedDays  1        0–30  (0 = highlighting off)
 *   highlightScope       "imports" | "importsEdits"
 *   frozenColumns        ["facility","type"]  (0–3 data columns, cap 3)
 *   freezeBelowPx        768     0–1920
 *
 * Pure + unit-tested (scripts/tableDisplay.test.ts): a corrupt or hostile
 * stored value falls back to the default — never breaks the page.
 */

import {
  COLUMN_BY_KEY,
  FROZEN_COLUMN_CAP,
  FROZEN_COLUMN_DEFAULTS,
} from "@/lib/masterColumns";
import type { HighlightScope } from "@/lib/recentUpdates";

export type DisplaySettings = {
  /** Frozen data column keys (Part D): special rows ["facility", "type"]. */
  frozenColumns: string[];
  /** Admin "Pin row checkbox" (default ON). */
  /** Admin "Disable freezing below (px)" (default 768). */
  freezeBelowPx: number;
  /** Part C: "Recently updated: days" — 0 turns highlighting off. */
  recentDays: number;
  /** Part C: "Highlight scope". */
  highlightScope: HighlightScope;
};

export const DISPLAY_DEFAULTS: DisplaySettings = {
  frozenColumns: [...FROZEN_COLUMN_DEFAULTS],
  freezeBelowPx: 768,
  recentDays: 1,
  highlightScope: "imports",
};

function readNumber(raw: unknown, fallback: number, min: number, max: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function readBool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

/** Parse the raw settings record ({} when absent) into DisplaySettings. */
export function readDisplaySettings(raw: Record<string, unknown> | undefined | null): DisplaySettings {
  const s = (raw ?? {}) as Record<string, unknown>;
  let frozenColumns: string[] = [...DISPLAY_DEFAULTS.frozenColumns];
  if (Array.isArray(s.frozenColumns)) {
    const keys = (s.frozenColumns as unknown[])
      .filter(
        (k): k is string =>
          typeof k === "string" &&
          !!COLUMN_BY_KEY[k] &&
          COLUMN_BY_KEY[k].type !== "action" &&
          // Type/Block/PHC are merged into the Facility cell now — only the
          // columns the admin may actually freeze survive a stored setting.
          COLUMN_BY_KEY[k].freezeable !== false,
      )
      .filter((k, i, arr) => arr.indexOf(k) === i)
      .slice(0, FROZEN_COLUMN_CAP);
    frozenColumns = keys;
  }
  return {
    frozenColumns,
    freezeBelowPx: readNumber(s.freezeBelowPx, DISPLAY_DEFAULTS.freezeBelowPx, 0, 1920),
    recentDays: readNumber(s.recentlyUpdatedDays, DISPLAY_DEFAULTS.recentDays, 0, 30),
    highlightScope: s.highlightScope === "importsEdits" ? "importsEdits" : "imports",
  };
}

/** Per-user boolean preference in localStorage (default = on). */
export function loadBoolPref(storageKey: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
}

export function saveBoolPref(storageKey: string, on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, on ? "on" : "off");
  } catch {
    /* private mode — the preference simply won't persist */
  }
}

export const FREEZE_PREF_KEY = "nqas.freezeColumns";
export const HIGHLIGHT_PREF_KEY = "nqas.highlightUpdates";
