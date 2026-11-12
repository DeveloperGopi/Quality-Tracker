import { describe, expect, it } from "bun:test";

import {
  FIELD_PANEL_PREF_KEY,
  readFieldPanelPreference,
  writeFieldPanelPreference,
} from "../src/lib/customReportPrefs";

function storage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    value: (key: string) => data.get(key) ?? null,
  };
}

describe("Custom Report field panel preference", () => {
  it("is visible when no preference has been saved", () => {
    expect(readFieldPanelPreference(storage())).toBe(true);
  });

  it("is visible when the stored value is corrupt or unrelated", () => {
    expect(readFieldPanelPreference(storage({ [FIELD_PANEL_PREF_KEY]: "yes" }))).toBe(true);
  });

  it("is hidden only after an explicit hide", () => {
    const s = storage();
    writeFieldPanelPreference(false, s);
    expect(s.value(FIELD_PANEL_PREF_KEY)).toBe("false");
    expect(readFieldPanelPreference(s)).toBe(false);
    writeFieldPanelPreference(true, s);
    expect(readFieldPanelPreference(s)).toBe(true);
  });
});
