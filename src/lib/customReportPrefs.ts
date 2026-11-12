/** Custom Report Builder display preferences.
 *
 * The field panel is visible unless the user explicitly hid it. A missing,
 * corrupt, or older preference therefore always opens with the panel shown.
 */

export const FIELD_PANEL_PREF_KEY = "nqas.customReport.fieldPanelOpen";

type ReadableStorage = Pick<Storage, "getItem">;

export function readFieldPanelPreference(storage?: ReadableStorage): boolean {
  try {
    return storage?.getItem(FIELD_PANEL_PREF_KEY) !== "false";
  } catch {
    return true;
  }
}

export function writeFieldPanelPreference(open: boolean, storage?: Pick<Storage, "setItem">): void {
  try {
    storage?.setItem(FIELD_PANEL_PREF_KEY, String(open));
  } catch {
    // Private browsing or storage disabled: the panel still works for this visit.
  }
}
