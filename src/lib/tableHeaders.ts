/** Admin-configurable table header labels.
 *
 *  The Admin Settings "Table headers" card stores a map of default column
 *  label -> custom label in appSettings under `tableHeaderOverrides` (via
 *  the existing audit-logged setSetting mutation). Tables resolve their
 *  display headers through `withOverrides`, so a rename in Admin Settings
 *  applies to the Facility Master List and Reports immediately — the data
 *  model and CSV exports keep the canonical master-sheet names. */

import { LEGACY_LABELS_BY_LABEL } from "@/lib/masterColumns";

export const HEADER_OVERRIDES_KEY = "tableHeaderOverrides";

export type HeaderOverrides = Record<string, string>;

/** Resolve display labels: overrides win when they hold a non-empty value
 *  that differs from the default. Unknown/default entries are ignored, so
 *  deleting an override in Admin falls back to the built-in label. */
export function withOverrides(
  headers: readonly string[],
  overrides: HeaderOverrides | undefined,
): string[] {
  if (!overrides) return [...headers];
  return headers.map((h) => {
    // A column that has since been renamed keeps its saved custom header:
    // the override may still be keyed by the label it used to print under.
    const legacy = (LEGACY_LABELS_BY_LABEL[h] ?? [])
      .map((l) => overrides[l])
      .find((v): v is string => typeof v === "string" && v.trim() !== "");
    const custom = overrides[h] ?? legacy;
    return typeof custom === "string" && custom.trim() ? custom : h;
  });
}

/** Only entries whose value actually differs from the default are stored —
 *  keeps the setting small and makes "Reset" per column trivial. */
export function buildOverrides(
  defaults: readonly string[],
  values: Record<string, string>,
): HeaderOverrides {
  const out: HeaderOverrides = {};
  for (const d of defaults) {
    const v = (values[d] ?? "").trim();
    if (v && v !== d) out[d] = v;
  }
  return out;
}
