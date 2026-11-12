/**
 * PERF INSTRUMENTATION (Step 1 of the speed brief) — User Timing marks +
 * measures with a dev-only console overlay. No-ops in production builds
 * (tree-shaken), zero UI, zero dependencies.
 *
 * Usage:
 *   perfMark("filter-change");               // start
 *   perfMeasure("filter-change");            // end + report
 *   perfRoute("Reports");                    // navigateTo content timing
 *
 * Read the results: Chrome DevTools → Performance → User Timing lane, or
 * `window.perfReport()` in the console (dev builds only).
 */

const DEV = (() => {
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
})();

const startedAt = new Map<string, number>();

export function perfMark(name: string): void {
  if (!DEV) return;
  startedAt.set(name, performance.now());
  if (typeof performance.mark === "function") performance.mark(`${name}:start`);
}

/** Ends a mark and reports the duration (ms). Returns null in production. */
export function perfMeasure(name: string): number | null {
  if (!DEV) return null;
  const start = startedAt.get(name);
  startedAt.delete(name);
  const ms = start == null ? null : Math.round((performance.now() - start) * 10) / 10;
  if (ms != null) {
    if (typeof performance.measure === "function") {
      try {
        performance.measure(name, `${name}:start`);
      } catch {
        /* mark missing — ignore */
      }
    }
    // Dev overlay: one compact line per measurement; long tasks stand out.
    // eslint-disable-next-line no-console
    console.info(
      ms > 100 ? `⏱ ${name}: ${ms.toFixed(1)}ms ⚠` : `⏱ ${name}: ${ms.toFixed(1)}ms`,
    );
  }
  return ms;
}

/** Route-change timing: mark on route enter, measure after the first paint. */
export function perfRoute(page: string): void {
  if (!DEV) return;
  const t0 = performance.now();
  requestAnimationFrame(() => {
    const ms = Math.round((performance.now() - t0) * 10) / 10;
    // eslint-disable-next-line no-console
    console.info(`⏱ route:${page} first frame: ${ms.toFixed(1)}ms`);
  });
}

/** Long-task watchdog (>50 ms) — counts main-thread jank per session. */
if (DEV && typeof window !== "undefined" && "PerformanceObserver" in window) {
  let total = 0;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        total += entry.duration;
        // eslint-disable-next-line no-console
        console.info(`⚠ long task ${(entry as PerformanceEntry & { duration: number }).duration.toFixed(0)}ms`);
      }
    }).observe({ entryTypes: ["longtask"] });
  } catch {
    /* older browsers — skip */
  }
  (window as unknown as { perfReport: () => string }).perfReport = () =>
    `long-task total: ${total.toFixed(0)}ms`;
}
