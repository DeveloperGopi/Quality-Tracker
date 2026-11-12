/** A one-control spotlight for "Open it" steps. No library, no page code. */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { takeGuideSpotlight, type GuideSpotlightRequest } from "@/lib/guideSpotlight";

type Rect = { top: number; left: number; width: number; height: number };

export function GuideSpotlight() {
  const [request, setRequest] = useState<GuideSpotlightRequest | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    const tryTake = () => {
      const next = takeGuideSpotlight();
      if (!next || cancelled) return;
      setRequest(next);
      setRect(null);
      const find = () => {
        if (cancelled) return;
        const element = document.querySelector(next.selector);
        if (element) {
          const box = element.getBoundingClientRect();
          if (box.width > 0 || box.height > 0) {
            // Scroll first, then measure: a smooth scroll would leave the
            // spotlight at the control's pre-scroll coordinates.
            element.scrollIntoView({ behavior: "auto", block: "center" });
            const afterScroll = element.getBoundingClientRect();
            setRect({
              top: Math.max(8, afterScroll.top),
              left: Math.max(8, afterScroll.left),
              width: Math.max(24, Math.min(afterScroll.width, window.innerWidth - 16)),
              height: Math.max(24, afterScroll.height),
            });
            return;
          }
        }
        attempts += 1;
        if (attempts < 40) timer = window.setTimeout(find, 120);
      };
      find();
    };

    tryTake();
    window.addEventListener("guide:spotlight", tryTake);
    return () => {
      cancelled = true;
      window.removeEventListener("guide:spotlight", tryTake);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!request) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setRequest(null);
        setRect(null);
      }
    };
    const onResize = () => {
      const element = request ? document.querySelector(request.selector) : null;
      if (!element) return;
      const box = element.getBoundingClientRect();
      setRect({
        top: Math.max(8, box.top),
        left: Math.max(8, box.left),
        width: Math.max(24, Math.min(box.width, window.innerWidth - 16)),
        height: Math.max(24, box.height),
      });
    };
    window.addEventListener("keydown", close);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [request]);

  if (!request || !rect || typeof document === "undefined") return null;

  const below = rect.top + rect.height + 12;
  const placeBelow = below < window.innerHeight - 150;
  const top = placeBelow ? below : Math.max(12, rect.top - 128);
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - 332));

  return createPortal(
    <div className="fixed inset-0 z-[130]" role="dialog" aria-modal="true" aria-label={request.label}>
      <button
        type="button"
        aria-label="Close help highlight"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={() => {
          setRequest(null);
          setRect(null);
        }}
      />
      <div
        className="pointer-events-none fixed rounded-lg border-2 border-amber-400 ring-4 ring-amber-300/50"
        style={{ top: rect.top - 3, left: rect.left - 3, width: rect.width + 6, height: rect.height + 6 }}
      />
      <div
        className="fixed w-80 rounded-xl border border-border bg-card p-3 shadow-2xl"
        style={{ top, left }}
      >
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-[14px] leading-relaxed text-foreground">
            {request.label}
          </p>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
            onClick={() => {
              setRequest(null);
              setRect(null);
            }}
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-[13px] text-slate-600">Press Esc to close.</p>
      </div>
    </div>,
    document.body,
  );
}
