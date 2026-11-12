/**
 * ONE tooltip layer for the whole app.
 *
 * Root cause this replaces: every control carried a native `title` AND a
 * bespoke tooltip (the sidebar's own TipLayer, two `InfoTip` copies and the
 * Radix tooltip), so hovering one control could show two floating boxes at
 * once — the dark pill plus the browser's black rectangle — and each
 * implementation fought for the top layer.
 *
 * The contract now:
 *   • an element opts in with `data-tip="…"` (never `title`),
 *   • exactly one `<div role="tooltip">` exists, in the browser top layer
 *     (`popover="manual"` + a portal to <body>), so no ancestor can clip it,
 *   • hover shows after 150 ms, keyboard focus immediately, touch after a
 *     450 ms long-press; Esc, pointer leave, blur, scroll or ANY popover
 *     opening dismisses it,
 *   • a tooltip never shows over an open popover, nor on a trigger whose own
 *     popover is open (`aria-expanded="true"`),
 *   • `data-tip-truncate` limits it to text that is actually cut
 *     (`scrollWidth > clientWidth`).
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { flushSync } from "react-dom";
import { placeTooltip } from "@/lib/sidebarTooltip";

export const TIP_DELAY_MS = 150;
export const TIP_LONG_PRESS_MS = 450;

type TipState = { text: string; el: HTMLElement } | null;

/** Mounted once (AppShell). Everything else just sets `data-tip`. */
let closer: (() => void) | null = null;

/** Close the open tooltip from anywhere (keyboard handlers, route changes). */
export function closeTip(): void {
  closer?.();
}

function isTruncated(el: HTMLElement): boolean {
  if (!el.hasAttribute("data-tip-truncate")) return true;
  return el.scrollWidth > el.clientWidth + 1;
}

function openPopoverElsewhere(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.querySelector("[popover]:popover-open:not([data-tip-layer])");
}

export function TipLayer() {
  const [tip, setTip] = useState<TipState>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const target = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const clear = () => {
      if (delay.current) {
        clearTimeout(delay.current);
        delay.current = null;
      }
      if (press.current) {
        clearTimeout(press.current);
        press.current = null;
      }
    };
    const hide = () => {
      clear();
      target.current = null;
      setTip(null);
    };
    closer = hide;

    const read = (el: HTMLElement | null) => {
      if (!el) return null;
      const text = el.dataset.tip?.trim();
      return text ? { text, el } : null;
    };

    const showNow = (hit: { text: string; el: HTMLElement }) => {
      if (openPopoverElsewhere()) return;
      if (hit.el.getAttribute("aria-expanded") === "true") return;
      if (!isTruncated(hit.el)) return;
      target.current = hit.el;
      // flushSync so the pill exists (and can be measured) in this frame.
      flushSync(() => setTip({ text: hit.text, el: hit.el }));
    };

    const schedule = (hit: { text: string; el: HTMLElement } | null, ms: number) => {
      clear();
      if (!hit) {
        hide();
        return;
      }
      target.current = hit.el;
      delay.current = setTimeout(() => {
        delay.current = null;
        showNow(hit);
      }, ms);
    };

    const onOver = (event: PointerEvent) => {
      const el = (event.target as HTMLElement | null)?.closest?.("[data-tip]") as
        | HTMLElement
        | null;
      if (!el) {
        hide();
        return;
      }
      if (event.pointerType === "touch") {
        // Touch: long-press only, never on scroll-through.
        clear();
        target.current = el;
        const hit = read(el);
        if (!hit) return;
        press.current = setTimeout(() => {
          press.current = null;
          showNow(hit);
        }, TIP_LONG_PRESS_MS);
        return;
      }
      const hit = read(el);
      if (!hit) {
        hide();
        return;
      }
      schedule(hit, TIP_DELAY_MS);
    };

    const onOut = (event: PointerEvent) => {
      const from = (event.target as HTMLElement | null)?.closest?.("[data-tip]");
      const to = (event.relatedTarget as HTMLElement | null)?.closest?.("[data-tip]");
      if (from && to === from) return; // moved between children of the same control
      hide();
    };

    const onFocusIn = (event: FocusEvent) => {
      const el = (event.target as HTMLElement | null)?.closest?.("[data-tip]") as
        | HTMLElement
        | null;
      const hit = read(el);
      if (hit) schedule(hit, 0);
      else hide();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };

    /* Any popover opening (light dismiss, dialogs, the palette) closes the
       pill: there is only ever ONE floating thing on screen. */
    const onToggle = () => hide();

    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("pointerdown", onOver, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("toggle", onToggle, true);
    document.addEventListener("beforetoggle", onToggle, true);
    document.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
    return () => {
      clear();
      closer = null;
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("pointerdown", onOver, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("toggle", onToggle, true);
      document.removeEventListener("beforetoggle", onToggle, true);
      document.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
    };
  }, []);

  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!el || !tip) return;
    const pop = el as HTMLElement & { showPopover?: () => void; hidePopover?: () => void };
    try {
      pop.showPopover?.();
    } catch {
      /* already open */
    }
    const rect = tip.el.getBoundingClientRect?.();
    const viewport = {
      width: window.innerWidth || document.documentElement.clientWidth || 1024,
      height: window.innerHeight || document.documentElement.clientHeight || 768,
    };
    const place = placeTooltip({
      anchor: rect ?? { left: 64, right: 88, top: 120, height: 44 },
      size: { width: el.offsetWidth || 160, height: el.offsetHeight || 24 },
      viewport,
    });
    el.style.left = `${place.left}px`;
    el.style.top = `${place.top}px`;
    el.dataset.flipped = place.flipped ? "1" : "0";
    return () => {
      try {
        pop.hidePopover?.();
      } catch {
        /* not open */
      }
    };
  }, [tip]);

  if (!tip) return null;
  const pill = (
    <div
      ref={tipRef}
      id="app-tip"
      role="tooltip"
      popover="manual"
      data-tip-layer="1"
      /* Long help text gets a wider pill (still ONE layer) instead of a
         10-line column. */
      data-wide={tip.text.length > 80 ? "1" : "0"}
      data-testid="app-tip"
      className="app-tip"
    >
      {tip.text}
    </div>
  );
  return typeof document === "undefined" ? pill : createPortal(pill, document.body);
}

