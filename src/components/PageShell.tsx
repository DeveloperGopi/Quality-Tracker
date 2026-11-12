/**
 * PAGE SHELL — the list-page layout: fixed title/filter area, one scrolling
 * body. The shell measures its top once per layout/viewport change and writes
 * `--page-shell-height`, so a table body fills exactly the space below the
 * app header and the toolbar. No scroll listener, no re-render while scrolling.
 */

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageShell({
  toolbar,
  children,
  footer,
  className,
  toolbarClassName,
  bodyClassName,
  bodyScroll = true,
}: {
  /** Fixed area directly under the app header (filters, tabs, counters). */
  toolbar?: ReactNode;
  children: ReactNode;
  /** Kept below the scrolling body (for example an edit-mode pager). */
  footer?: ReactNode;
  className?: string;
  toolbarClassName?: string;
  bodyClassName?: string;
  /** false when the child owns the only scrollport (the Master List table). */
  bodyScroll?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // A list page always starts at the top; otherwise a restored scroll
    // position would measure a negative top and overflow the viewport.
    if (window.scrollY !== 0) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;

    const measure = () => {
      raf = 0;
      const rect = root.getBoundingClientRect();
      const top = Math.max(0, Math.round(rect.top));
      // Stop the shell above BOTH bottom paddings: AppShell's <main> pb-8 and
      // the app-shell's 12px inset. Leaving either out creates a page scrollbar
      // under the fixed list chrome. Measure them, never hard-code the theme.
      const mainEl = root.closest("main");
      const shellEl = root.closest(".app-shell");
      const bottom =
        (mainEl ? Number.parseFloat(getComputedStyle(mainEl).paddingBottom) || 0 : 0) +
        (shellEl ? Number.parseFloat(getComputedStyle(shellEl).paddingBottom) || 0 : 0);
      const height = Math.max(240, Math.round(window.innerHeight - top - bottom));
      root.style.setProperty("--page-shell-top", `${top}px`);
      root.style.setProperty("--page-shell-height", `${height}px`);
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };

    measure();
    const ro = new ResizeObserver(schedule);
    ro.observe(document.documentElement);
    const main = root.closest("main");
    if (main) ro.observe(main);
    if (toolbarRef.current) ro.observe(toolbarRef.current);
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-page-shell
      className={cn(
        "page-shell flex min-h-0 flex-col overflow-hidden",
        className,
      )}
      style={{ height: "var(--page-shell-height, calc(100dvh - 12rem))" }}
    >
      {toolbar ? (
        <div ref={toolbarRef} className={cn("shrink-0", toolbarClassName)}>
          {toolbar}
        </div>
      ) : null}
      <div
        data-page-shell-body
        className={cn(
          "min-h-0 flex-1 overscroll-auto",
          bodyScroll ? "overflow-y-auto" : "overflow-hidden",
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
}
