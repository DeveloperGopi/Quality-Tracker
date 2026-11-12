/**
 * RAIL TOOLTIP PLACEMENT — the clipped-tooltip regression.
 *
 * The pill used to be placed at `rect.right + 10` with no viewport check, so
 * near the right edge (or at 125–150% zoom) it ran past the viewport and was
 * cut off. `placeTooltip()` is the one rule: right of the trigger, FLIPPED to
 * the left when it would not fit, and clamped vertically.
 *
 * Run: bun test ./scripts
 */
import { describe, expect, test } from "bun:test";

import { TIP_EDGE, TIP_GAP, placeTooltip } from "../src/lib/sidebarTooltip";

const VIEWPORT = { width: 1024, height: 720 };

describe("rail tooltip placement", () => {
  test("sits 10px right of the trigger, vertically centred", () => {
    const place = placeTooltip({
      anchor: { left: 64, right: 88, top: 200, height: 44 },
      size: { width: 160, height: 24 },
      viewport: VIEWPORT,
    });
    expect(place.left).toBe(88 + TIP_GAP);
    // `top` is the pill's TOP edge: the trigger's centre (222) minus half.
    expect(place.top).toBe(222 - 12);
    expect(place.flipped).toBe(false);
  });

  test("a panel lines up with its trigger's top edge (align: start)", () => {
    const place = placeTooltip({
      anchor: { left: 64, right: 88, top: 200, height: 44 },
      size: { width: 320, height: 360 },
      viewport: VIEWPORT,
      align: "start",
    });
    expect(place.top).toBe(200);
    expect(place.left).toBe(88 + TIP_GAP);
  });

  test("flips to the left when the pill would pass the right edge (zoom / narrow)", () => {
    const place = placeTooltip({
      anchor: { left: 980, right: 1004, top: 300, height: 44 },
      size: { width: 200, height: 24 },
      viewport: VIEWPORT,
    });
    expect(place.flipped).toBe(true);
    expect(place.left).toBe(980 - TIP_GAP - 200);
    // Fully inside the viewport.
    expect(place.left).toBeGreaterThanOrEqual(TIP_EDGE);
    expect(place.left + 200).toBeLessThanOrEqual(VIEWPORT.width - TIP_EDGE + 0.0001);
  });

  test("never clips at the edges: left/top/bottom are clamped", () => {
    const farRight = placeTooltip({
      anchor: { left: 1000, right: 1020, top: 10, height: 44 },
      size: { width: 300, height: 24 },
      viewport: VIEWPORT,
    });
    expect(farRight.left).toBeGreaterThanOrEqual(TIP_EDGE);
    expect(farRight.left + 300).toBeLessThanOrEqual(VIEWPORT.width - TIP_EDGE);

    const topEdge = placeTooltip({
      anchor: { left: 64, right: 88, top: 2, height: 20 },
      size: { width: 120, height: 40 },
      viewport: VIEWPORT,
    });
    expect(topEdge.top).toBe(TIP_EDGE);

    const bottomEdge = placeTooltip({
      anchor: { left: 64, right: 88, top: 700, height: 20 },
      size: { width: 120, height: 40 },
      viewport: VIEWPORT,
    });
    // The whole 40px pill stays inside: no half-height overhang any more.
    expect(bottomEdge.top + 40).toBeLessThanOrEqual(VIEWPORT.height - TIP_EDGE);
  });

  test("the last rail item at the bottom of a short viewport is still fully visible", () => {
    const short = { width: 768, height: 540 };
    const place = placeTooltip({
      anchor: { left: 64, right: 88, top: 500, height: 44 },
      size: { width: 180, height: 24 },
      viewport: short,
    });
    expect(place.top + 24).toBeLessThanOrEqual(short.height - TIP_EDGE);
    expect(place.top).toBeGreaterThanOrEqual(TIP_EDGE);
  });
});
