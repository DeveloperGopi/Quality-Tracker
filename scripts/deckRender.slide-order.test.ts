import { describe, expect, it } from "bun:test";
import { DEFAULT_SLIDE_ORDER, type DeckSlideId } from "../src/lib/deckRender";

/** Compile-time exhaustiveness: adding a new DeckSlideId without updating
 *  this map (and therefore the order test below) fails `tsc`. */
const ALL_SLIDES: Record<DeckSlideId, true> = {
  title: true,
  exec: true,
  where: true,
  profile: true,
  progress: true,
  barriers: true,
  ia: true,
  pipeline: true,
  buildings: true,
  validity: true,
  byYear: true,
  heatmap: true,
  yearA: true,
  yearB: true,
  takeaways: true,
  checks: true,
  defs: true,
};

describe("deck slide order (drag-to-reorder contract)", () => {
  it("contains every slide id exactly once", () => {
    const ids = [...DEFAULT_SLIDE_ORDER];
    expect(ids.length).toBe(Object.keys(ALL_SLIDES).length);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.keys(ALL_SLIDES).sort());
  });

  it("opens with the title, closes with takeaways, and ends with definitions", () => {
    expect(DEFAULT_SLIDE_ORDER[0]).toBe("title");
    // Part 5.6: the definitions/method slide sits AFTER takeaways as the
    // final page of the deck.
    expect(DEFAULT_SLIDE_ORDER[DEFAULT_SLIDE_ORDER.length - 1]).toBe("defs");
    // The data-checks slide sits between the takeaways and the definitions.
    expect(DEFAULT_SLIDE_ORDER[DEFAULT_SLIDE_ORDER.length - 2]).toBe("checks");
    expect(DEFAULT_SLIDE_ORDER[DEFAULT_SLIDE_ORDER.length - 3]).toBe(
      "takeaways",
    );
  });
});
