/**
 * FLOATING-LAYER PLACEMENT — pure, testable geometry, shared by the tooltip
 * pill and the sidebar popovers.
 *
 * Both live in the browser top layer (`popover`), so no ancestor overflow can
 * clip them — but the top layer does NOT clip itself to the viewport: a pill
 * anchored at `rect.right + 10` runs off the right edge when the rail sits
 * near it (or at 125–150% zoom). This module is the one placement rule:
 *
 *   • default — to the RIGHT of the trigger (`flip-inline`), flipped to the
 *     left when it would not fit, then clamped so it never leaves the screen,
 *   • vertically centred on the trigger (a pill) or top-aligned to it (a
 *     popover panel), clamped with `flip-block` behaviour at either edge.
 *
 * `left`/`top` are the panel's TOP-LEFT corner (what `style.left/top` set).
 */

export type TooltipPlacement = { left: number; top: number; flipped: boolean };

export const TIP_GAP = 10;
/** 8px keeps the panel inside the card inset / the viewport's rounded edge. */
export const TIP_EDGE = 8;

export function placeTooltip({
  anchor,
  size,
  viewport,
  align = "center",
}: {
  /** The trigger's box (`getBoundingClientRect()`). */
  anchor: { left: number; right: number; top: number; height: number };
  /** The panel's own box (offsetWidth/offsetHeight). */
  size: { width: number; height: number };
  viewport: { width: number; height: number };
  /** `center` for a one-line pill, `start` for a tall popover panel. */
  align?: "center" | "start";
}): TooltipPlacement {
  const width = Math.max(1, size.width);
  const height = Math.max(1, size.height);
  const maxLeft = Math.max(TIP_EDGE, viewport.width - width - TIP_EDGE);
  const maxTop = Math.max(TIP_EDGE, viewport.height - height - TIP_EDGE);

  // Preferred: right of the trigger. Flip to the left when it would pass the
  // viewport's right edge (the rail is pinned to the left, so this is the
  // zoom / narrow-window case).
  let left = anchor.right + TIP_GAP;
  let flipped = false;
  if (left + width > viewport.width - TIP_EDGE) {
    left = anchor.left - TIP_GAP - width;
    flipped = true;
  }
  left = Math.min(Math.max(TIP_EDGE, left), maxLeft);

  // Vertical: centred on the trigger (pill) or flush with its top (panel).
  const preferred =
    align === "start" ? anchor.top : anchor.top + anchor.height / 2 - height / 2;
  const top = Math.min(Math.max(TIP_EDGE, preferred), maxTop);

  return { left: Math.round(left), top: Math.round(top), flipped };
}
