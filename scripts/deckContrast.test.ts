/**
 * CI GUARD — every text colour on a slide is checked against the SURFACE it
 * sits on, not against the page theme. This is the regression test for the
 * unreadable dark-on-dark cover and the white numbers on amber/light stacked
 * bars: the palette pairs and `inkOnFill` must reach 4.5:1 (AA for body text).
 *
 * It also pins the Admin-configurable certified-rate bands: a malformed stored
 * value falls back to 75 / 50 instead of drawing a legend with impossible bands.
 */
import { describe, expect, test } from "bun:test";
import {
  DECK_SURFACES,
  TONE_TEXT,
  TONE_TEXT_DARK,
} from "../src/components/deck/DeckSlidePreview";
import {
  DEFAULT_RATE_BANDS,
  TONE_HEX,
  TONE_INK_LIGHT,
  inkOnFill,
  parseRateBands,
  type Tone,
} from "../src/lib/deckModel";

const TONES: Tone[] = ["teal", "amber", "coral", "blue", "grey", "light"];

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const channel = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("deck slide contrast (AA against the real surface)", () => {
  test("every ink pair on every surface reaches 4.5:1", () => {
    for (const [name, s] of Object.entries(DECK_SURFACES)) {
      const pairs: [string, string, string][] = [
        [`${name} ink/bg`, s.ink, s.bg],
        [`${name} muted/bg`, s.muted, s.bg],
        [`${name} ink/panel`, s.ink, s.panel],
        [`${name} muted/panel`, s.muted, s.panel],
        [`${name} accent/panel`, s.accent, s.panel],
        [`${name} title ink/bar`, s.titleInk, s.titleBar],
      ];
      for (const [label, fg, bg] of pairs) {
        // The label is in the assertion so a failure names the surface pair.
        expect({ label, ok: contrast(fg, bg) >= 4.5 }).toEqual({ label, ok: true });
      }
    }
  });

  test("the tone ink palettes pass on their own surfaces", () => {
    for (const tone of TONES) {
      expect(contrast(TONE_TEXT[tone], DECK_SURFACES.light.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(TONE_TEXT[tone], DECK_SURFACES.light.panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(TONE_TEXT_DARK[tone], DECK_SURFACES.dark.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(TONE_TEXT_DARK[tone], DECK_SURFACES.dark.panel)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("text inside a stacked segment or heat cell stays readable on every fill", () => {
    for (const tone of TONES) {
      expect(contrast(inkOnFill(TONE_HEX[tone]), TONE_HEX[tone])).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("the PPTX and PDF KPI panels use the same accessible ink", () => {
    // All three renderers paint values on the shared light panel. Amber, grey
    // and light are unreadable there as fills.
    for (const tone of TONES) {
      expect(contrast(TONE_INK_LIGHT[tone], DECK_SURFACES.light.panel)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("certified-rate bands come from config", () => {
  test("the default is 75 / 50", () => {
    expect(DEFAULT_RATE_BANDS).toEqual({ green: 75, amber: 50 });
  });

  test("a stored pair is accepted only when it is a valid 0..100 range", () => {
    expect(parseRateBands({ green: 80, amber: 60 })).toEqual({ green: 80, amber: 60 });
    expect(parseRateBands({ green: 60, amber: 60 })).toEqual(DEFAULT_RATE_BANDS);
    expect(parseRateBands({ green: 40, amber: 60 })).toEqual(DEFAULT_RATE_BANDS);
    expect(parseRateBands({ green: 120, amber: 50 })).toEqual(DEFAULT_RATE_BANDS);
    expect(parseRateBands("75/50")).toEqual(DEFAULT_RATE_BANDS);
    expect(parseRateBands(null)).toEqual(DEFAULT_RATE_BANDS);
  });
});
