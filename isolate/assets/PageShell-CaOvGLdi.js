import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports } from './icons-BxQpodNr.js';
import { c as cn } from './index-CBV6wOh8.js';

function PageShell({
  toolbar,
  children,
  footer,
  className,
  toolbarClassName,
  bodyClassName,
  bodyScroll = true
}) {
  const rootRef = reactExports.useRef(null);
  const toolbarRef = reactExports.useRef(null);
  reactExports.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.scrollY !== 0) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);
  reactExports.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const rect = root.getBoundingClientRect();
      const top = Math.max(0, Math.round(rect.top));
      const mainEl = root.closest("main");
      const shellEl = root.closest(".app-shell");
      const bottom = (mainEl ? Number.parseFloat(getComputedStyle(mainEl).paddingBottom) || 0 : 0) + (shellEl ? Number.parseFloat(getComputedStyle(shellEl).paddingBottom) || 0 : 0);
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref: rootRef,
      "data-page-shell": true,
      className: cn(
        "page-shell flex min-h-0 flex-col overflow-hidden",
        className
      ),
      style: { height: "var(--page-shell-height, calc(100dvh - 12rem))" },
      children: [
        toolbar ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: toolbarRef, className: cn("shrink-0", toolbarClassName), children: toolbar }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            "data-page-shell-body": true,
            className: cn(
              "min-h-0 flex-1 overscroll-auto",
              bodyScroll ? "overflow-y-auto" : "overflow-hidden",
              bodyClassName
            ),
            children
          }
        ),
        footer ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0", children: footer }) : null
      ]
    }
  );
}

export { PageShell as P };
