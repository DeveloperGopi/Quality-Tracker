/**
 * EXPORT DIALOG — hook-order contract (React error #310 / #300).
 *
 * "Rendered more hooks than during the previous render" happens when a hook
 * runs on one render but not on another — a hook after an early return, or a
 * custom hook called inside an `if`. Both export dialogs are mounted here in
 * happy-dom through the exact sequence a user drives:
 *
 *   open → close → reopen → switch PDF / Excel / CSV → 0 rows → 157 rows
 *
 * Every render is asserted to throw nothing and to log no hook error, so a
 * future conditional hook fails this test instead of the preview.
 *
 * Run: bun test ./scripts
 */
import { describe, expect, test, afterEach } from "bun:test";
import { Window } from "happy-dom";

/* ------------------------------------------------------------------ */
/* DOM globals (same pattern as scripts/pivot.dom.test.ts)             */
/* ------------------------------------------------------------------ */

const win = new Window({ url: "http://localhost/" });

function defineGlobal(key: string, value: unknown) {
  try {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  } catch {
    /* Bun's own read-only globals (navigator, …) stay as they are */
  }
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

defineGlobal("window", win);
defineGlobal("document", win.document);
defineGlobal("HTMLElement", win.HTMLElement);
defineGlobal("Element", win.Element);
defineGlobal("Node", win.Node);
// Radix's Dialog/FocusScope/Select touch these on mount and focus.
for (const key of [
  "NodeFilter",
  "DocumentFragment",
  "HTMLInputElement",
  "HTMLButtonElement",
  "SVGElement",
  "DOMRect",
  "IntersectionObserver",
  "FocusEvent",
  "InputEvent",
] as const) {
  defineGlobal(key, (win as unknown as Record<string, unknown>)[key]);
}
defineGlobal("Event", win.Event);
defineGlobal("CustomEvent", (win as unknown as { CustomEvent: typeof CustomEvent }).CustomEvent);
defineGlobal("MouseEvent", (win as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent);
defineGlobal(
  "MutationObserver",
  (win as unknown as { MutationObserver?: typeof MutationObserver }).MutationObserver,
);
defineGlobal(
  "PointerEvent",
  (win as unknown as { PointerEvent?: typeof PointerEvent }).PointerEvent ??
    (win as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent,
);
defineGlobal("KeyboardEvent", (win as unknown as { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent);
defineGlobal(
  "getComputedStyle",
  (win as unknown as { getComputedStyle?: (e: Element) => CSSStyleDeclaration }).getComputedStyle?.bind(win),
);
defineGlobal(
  "requestAnimationFrame",
  (win as unknown as { requestAnimationFrame?: (cb: FrameRequestCallback) => number }).requestAnimationFrame?.bind(
    win,
  ) ?? ((cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number),
);
defineGlobal(
  "ResizeObserver",
  typeof (win as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver === "function"
    ? (win as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver
    : ResizeObserverStub,
);

const extras = win as unknown as { matchMedia?: unknown };
if (typeof extras.matchMedia !== "function") {
  extras.matchMedia = (media: string) => ({
    matches: false,
    media,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
}

defineGlobal("matchMedia", extras.matchMedia);
/** React only flushes act() work when it is told it runs in a test. */
defineGlobal("IS_REACT_ACT_ENVIRONMENT", true);

/* ------------------------------------------------------------------ */
/* Mount helpers                                                       */
/* ------------------------------------------------------------------ */

type CreateRoot = typeof import("react-dom/client").createRoot;
type ReactModule = typeof import("react");

let react: ReactModule;
let createRoot: CreateRoot;
let masterDialog: typeof import("../src/components/master/ExportDialog");
let pivotDialog: typeof import("../src/components/custom-report/ExportDialog");
let pivotLib: typeof import("../src/lib/pivot");
let masterColumns: typeof import("../src/lib/masterColumns");

async function deps() {
  if (!react) react = await import("react");
  if (!createRoot) createRoot = (await import("react-dom/client")).createRoot;
  if (!masterDialog) masterDialog = await import("../src/components/master/ExportDialog");
  if (!pivotDialog) pivotDialog = await import("../src/components/custom-report/ExportDialog");
  if (!pivotLib) pivotLib = await import("../src/lib/pivot");
  if (!masterColumns) masterColumns = await import("../src/lib/masterColumns");
  return { react, createRoot };
}

async function tick(ms = 5) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type Mounted = {
  /** Re-render the SAME root, i.e. the same component instances. */
  render: (element: unknown) => Promise<void>;
  container: HTMLElement;
  /** Everything React reported (render errors + console.error). */
  errors: string[];
  unmount: () => void;
};

const mounted: Mounted[] = [];

function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

async function mount(element: unknown): Promise<Mounted> {
  const { react: r, createRoot: cr } = await deps();
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);

  const errors: string[] = [];
  const record = (err: unknown) => errors.push(describeError(err));

  const root = cr(container, {
    onUncaughtError: record,
    onCaughtError: record,
    onRecoverableError: record,
  } as never);

  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map((a) => describeError(a)).join(" "));
  };

  const render = async (next: unknown) => {
    await r.act(async () => {
      root.render(next as never);
      await tick();
    });
  };

  try {
    await render(element);
  } catch (err) {
    errors.push(describeError(err));
  }

  const entry: Mounted = {
    render,
    container,
    errors,
    unmount: () => {
      console.error = originalError;
      try {
        r.act(() => root.unmount());
      } catch {
        /* already gone */
      }
      container.remove();
    },
  };
  mounted.push(entry);
  return entry;
}

function cleanup() {
  while (mounted.length) mounted.pop()?.unmount();
}

/** All descendants of the portalled dialog, not just the mount container. */
function bodyNodes(): HTMLElement[] {
  return Array.from(win.document.body.querySelectorAll<HTMLElement>("*"));
}

function clickByText(text: string): boolean {
  const target = bodyNodes().find(
    (el) =>
      (el.tagName === "BUTTON" || el.getAttribute("role") === "button") &&
      (el.textContent ?? "").trim() === text,
  );
  if (!target) return false;
  target.dispatchEvent(new (win as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent("click", {
    bubbles: true,
    cancelable: true,
  }) as unknown as Event);
  return true;
}

function hookErrors(errors: string[]): string[] {
  return errors.filter((e) =>
    /rendered (more|fewer) hooks|Rendered (more|fewer) hooks than|#31[0-9]|#300|rules-of-hooks|Invalid hook call/i.test(
      e,
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Master Export dialog (Reports / Facility List)                      */
/* ------------------------------------------------------------------ */

describe("master Export dialog — hook order", () => {
  afterEach(() => cleanup());

  test("open, close, reopen, PDF/Excel/CSV, 0 and 157 rows — no hook errors", async () => {
    await deps();
    const h = react.createElement;
    const columns = (masterColumns.fullExportColumns() as unknown[])
      .slice(0, 8) as never[];

    const runs: string[] = [];
    const build = (open: boolean, rows: number, hasRecentUpdates: boolean) => {
      const counts = { filtered: rows, all: rows, selected: 0 };
      return h(masterDialog.ExportDialog as never, {
        open,
        onOpenChange: () => {},
        counts,
        visibleColumns: columns,
        filtersText: rows === 0 ? "" : "Block: Bargur",
        onRun: (plan: { format: string }) => runs.push(plan.format),
        hasRecentUpdates,
        recentLegend: "Updated in the last 7 days",
      } as never);
    };

    // 0 rows, open
    const view = await mount(build(true, 0, false));
    expect(hookErrors(view.errors)).toEqual([]);

    // close → reopen (the reported sequence)
    await view.render(build(false, 0, false));
    await view.render(build(true, 0, false));
    await view.render(build(false, 0, false));
    await view.render(build(true, 0, false));
    expect(hookErrors(view.errors)).toEqual([]);

    // 157 rows, and the optional "recently updated" block appears/disappears
    await view.render(build(true, 157, true));
    await view.render(build(true, 157, false));
    await view.render(build(true, 157, true));
    expect(hookErrors(view.errors)).toEqual([]);

    // switch formats: each button hands a plan back and closes the dialog
    for (const [label, format] of [
      ["CSV", "csv"],
      ["PDF", "pdf"],
      ["Excel", "xlsx"],
      ["Print", "print"],
    ] as [string, string][]) {
      expect(clickByText(label)).toBe(true);
      await view.render(build(true, 157, true));
      expect(runs.at(-1)).toBe(format);
    }

    expect(hookErrors(view.errors)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Custom-report Export dialog (Pivot)                                 */
/* ------------------------------------------------------------------ */

describe("custom-report Export dialog — hook order", () => {
  afterEach(() => cleanup());

  test("open, close, reopen, Excel/PDF/CSV, 0 and 157 rows — no hook errors", async () => {
    await deps();
    const h = react.createElement;
    const fields = pivotLib.createPivotFields();

    const config = {
      rows: ["block"],
      columns: ["certStatus"],
      values: [{ fieldId: "facilityName", agg: "count" }],
      filters: {},
      sort: { kind: "label", dir: "asc" },
    } as never;

    const rowsFor = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        facility: {
          _id: `F${i}`,
          name: `Facility ${i}`,
          block: `Block ${i % 10}`,
          phc: `Block ${i % 10} PHC`,
          facilityType: i % 2 === 0 ? "PHC" : "HWC HSC",
          currentStatus: i % 3 === 0 ? "Quality Certified" : "SA Not Yet Initiated",
          eligibility: "Eligible",
        },
        cycleNumber: 1,
        nqas:
          i % 3 === 0
            ? { status: "Completed", certificationStatus: "Quality Certified", scorePercent: 80 }
            : null,
        sa: { status: "Completed", scorePercent: 70 },
        fund: null,
      })) as never[];

    const build = (open: boolean, count: number) => {
      const result = pivotLib.buildPivot({ rows: rowsFor(count), fields, config } as never);
      return h(pivotDialog.ExportDialog as never, {
        open,
        onOpenChange: () => {},
        result,
        rawRows: [],
        filtersList: count === 0 ? [] : ["Block: Bargur"],
        chart: count === 0 ? null : { labels: ["Block 0"], values: [5], title: "Top blocks" },
        defaultTitle: "NQAS Custom Report",
        defaultSubtitle: "Facility quality certification tracker",
        defaultDistrict: "Tirupathur district, Tamil Nadu",
        defaultGeneratedBy: "NQAS Tracker user",
      } as never);
    };

    const view = await mount(build(true, 0));
    expect(hookErrors(view.errors)).toEqual([]);

    await view.render(build(false, 0));
    await view.render(build(true, 0));
    await view.render(build(false, 0));
    await view.render(build(true, 0));
    expect(hookErrors(view.errors)).toEqual([]);

    await view.render(build(true, 157));
    expect(hookErrors(view.errors)).toEqual([]);

    // Format tiles are state, not a plan: they must switch without remounting.
    for (const label of ["CSV", "PDF", "Excel (.xlsx)", "PDF", "CSV"]) {
      expect(clickByText(label)).toBe(true);
      await view.render(build(true, 157));
      expect(hookErrors(view.errors)).toEqual([]);
    }

    // The chart toggle and the filters summary only exist on the PDF tab.
    expect(hookErrors(view.errors)).toEqual([]);
  });
});
